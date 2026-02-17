import { TrioWebhookPayload, TrioMode } from '@/types';
import {
  markInitialized,
  findZoneByJobId,
  getZone,
  addAlert,
  updateRiskFactor,
  setLastTrioCheck,
  setStreamOnline,
  setJobId,
  addError,
  getEnabledZoneStates,
  setActiveJobCount,
  updateZoneEnvironmental,
  setDigestNarrative,
  updateZoneRisk,
  resetState,
  getTrioBudget,
  setTrioMode,
  incrementCheckOnceUsed,
  incrementLiveMinutes,
} from './store';
import { updateAndComputeRisk, deriveEnvironmentalFactors } from './risk-engine';
import { fetchAllEnvironmental } from './noaa-client';
import * as trio from './trio-client';
import { TRIO_CONDITIONS, getEnabledZones } from './zone-config';

// ===== Timer References (on globalThis to survive HMR in dev mode) =====
interface OrchestratorGlobals {
  __bw_checkOnce?: ReturnType<typeof setInterval> | null;
  __bw_noaa?: ReturnType<typeof setInterval> | null;
  __bw_running?: boolean;
  __bw_zoneIdx?: number;
  __bw_condIdx?: number;
}
const g = globalThis as unknown as OrchestratorGlobals;

function getCheckOnceInterval() { return g.__bw_checkOnce ?? null; }
function setCheckOnceInterval(v: ReturnType<typeof setInterval> | null) { g.__bw_checkOnce = v; }
function getNoaaInterval() { return g.__bw_noaa ?? null; }
function setNoaaInterval(v: ReturnType<typeof setInterval> | null) { g.__bw_noaa = v; }
function getIsRunning() { return g.__bw_running ?? false; }
function setIsRunning(v: boolean) { g.__bw_running = v; }
function getZoneIndex() { return g.__bw_zoneIdx ?? 0; }
function setZoneIndex(v: number) { g.__bw_zoneIdx = v; }
function getConditionIndex() { return g.__bw_condIdx ?? 0; }
function setConditionIndex(v: number) { g.__bw_condIdx = v; }

// ===== Constants =====
const NOAA_INTERVAL_MS = 5 * 60_000;      // 5 minutes
const JOB_RESTART_DELAY_MS = 3_000;

// Mode-specific timing
const DEMO_CHECK_INTERVAL_MS = 30_000;     // 30 seconds
const CONSERVATIVE_CHECK_INTERVAL_MS = 60_000; // 60 seconds

// Budget limits
const CHECK_ONCE_DAILY_LIMIT = 50;
const LIVE_MINUTES_DAILY_LIMIT = 30;

// Conditions to rotate through (PRIMARY and SWIMMERS alternate, EMERGENCY on-demand)
const CONDITION_ROTATION: { key: 'highCrowdNearWaterline' | 'swimmersDetected'; condition: string }[] = [
  { key: 'highCrowdNearWaterline', condition: TRIO_CONDITIONS.PRIMARY },
  { key: 'swimmersDetected', condition: TRIO_CONDITIONS.SWIMMERS },
];

/**
 * Start all monitoring: check-once polling + NOAA fetching.
 * Live-monitor and live-digest are on-demand only (not auto-started).
 */
export async function startAll(options?: { skipTrio?: boolean }): Promise<{ jobsCreated: number; message: string }> {
  if (getIsRunning()) {
    return { jobsCreated: 0, message: 'Already running' };
  }
  setIsRunning(true);
  markInitialized();

  const enabledZones = getEnabledZones();
  if (enabledZones.length === 0) {
    addError('No enabled zones found. Enable zones in zone-config.ts and add stream URLs.');
    return { jobsCreated: 0, message: 'No enabled zones' };
  }

  console.log(`[orchestrator] Starting monitoring for ${enabledZones.length} zones`);

  // Mark streams with URLs as online
  for (const zone of enabledZones) {
    if (!zone.streamUrl) {
      setStreamOnline(zone.id, false);
      continue;
    }
    setStreamOnline(zone.id, true);
    console.log(`[orchestrator] Zone ${zone.id}: stream online`);
  }

  // Initial NOAA fetch (free — no API cost)
  fetchNoaaForAllZones().catch((e) =>
    console.error('[orchestrator] Initial NOAA fetch failed:', e),
  );

  // Start check-once polling unless skipTrio is set
  // When skipTrio is true, Trio API calls only start when presenter clicks GO LIVE
  if (!options?.skipTrio) {
    const budget = getTrioBudget();
    const intervalMs = budget.mode === 'demo' ? DEMO_CHECK_INTERVAL_MS : CONSERVATIVE_CHECK_INTERVAL_MS;

    setCheckOnceInterval(setInterval(() => {
      runCheckOnceCycle().catch((e) =>
        console.error('[orchestrator] check-once cycle error:', e),
      );
    }, intervalMs));

    console.log(`[orchestrator] Check-once started (${budget.mode} mode, every ${intervalMs / 1000}s)`);
  } else {
    console.log('[orchestrator] Trio API calls deferred — waiting for GO LIVE');
  }

  // Start NOAA polling timer (free — no API cost)
  setNoaaInterval(setInterval(() => {
    fetchNoaaForAllZones().catch((e) =>
      console.error('[orchestrator] NOAA fetch error:', e),
    );
  }, NOAA_INTERVAL_MS));

  setActiveJobCount(0);
  const mode = options?.skipTrio ? 'standby (NOAA only)' : getTrioBudget().mode;
  console.log(`[orchestrator] System started in ${mode} mode.`);

  return { jobsCreated: 0, message: `Monitoring ${enabledZones.length} zones (${mode})` };
}

/**
 * Stop all monitoring: cancel jobs, clear timers, reset state.
 */
export async function stopAll(): Promise<void> {
  const ci = getCheckOnceInterval();
  const ni = getNoaaInterval();
  if (ci) clearInterval(ci);
  if (ni) clearInterval(ni);
  setCheckOnceInterval(null);
  setNoaaInterval(null);
  setIsRunning(false);

  // Cancel all running Trio jobs
  try {
    const cancelled = await trio.cancelAllJobs();
    console.log(`[orchestrator] Stopped. Cancelled ${cancelled} jobs.`);
  } catch (e) {
    console.error('[orchestrator] Error cancelling jobs:', e);
  }

  resetState();
}

// ===== Mode Switching =====

/**
 * Switch to demo mode: faster check-once interval, all zones every cycle.
 */
export function startDemoMode(): { success: boolean; message: string } {
  setTrioMode('demo');

  // Restart the check-once timer with demo interval
  const ci = getCheckOnceInterval();
  if (ci) clearInterval(ci);

  setCheckOnceInterval(setInterval(() => {
    runCheckOnceCycle().catch((e) =>
      console.error('[orchestrator] check-once cycle error:', e),
    );
  }, DEMO_CHECK_INTERVAL_MS));

  console.log('[orchestrator] Switched to DEMO mode (30s interval, all zones)');
  return { success: true, message: 'Demo mode activated — check-once every 30s on all zones' };
}

/**
 * Stop demo mode: fully stop check-once polling (zero Trio API calls).
 * Presenter must click GO LIVE again to resume.
 */
export function stopDemoMode(): { success: boolean; message: string } {
  setTrioMode('conservative');

  const ci = getCheckOnceInterval();
  if (ci) clearInterval(ci);
  setCheckOnceInterval(null);

  console.log('[orchestrator] STOPPED — check-once polling halted, zero Trio API calls');
  return { success: true, message: 'Stopped — all Trio API calls halted. Press GO LIVE to resume.' };
}

// ===== Manual Trio Triggers =====

/**
 * Manually trigger a live-monitor job on a specific zone.
 * Uses the 1 concurrent job slot. Auto-stops after ~5 minutes.
 */
export async function triggerLiveMonitor(zoneId: string): Promise<{ success: boolean; message: string; jobId?: string }> {
  const zone = getZone(zoneId);
  if (!zone || !zone.config.streamUrl) {
    return { success: false, message: `Zone ${zoneId} not found or no stream URL` };
  }

  const budget = getTrioBudget();
  if (budget.liveMinutesUsed >= LIVE_MINUTES_DAILY_LIMIT) {
    return { success: false, message: 'Live minutes budget exhausted (30/30)' };
  }

  const webhookUrl = `${process.env.NGROK_URL}/api/webhooks/trio`;

  try {
    // Cancel any existing live jobs first
    await trio.cancelAllJobs();

    const result = await trio.startLiveMonitor(
      zone.config.streamUrl,
      TRIO_CONDITIONS.PRIMARY,
      webhookUrl,
    );
    setJobId(zoneId, 'liveMonitor', result.job_id);
    setActiveJobCount(1);
    incrementLiveMinutes(5); // Budget 5 min per trigger

    console.log(`[orchestrator] Live-monitor started on ${zoneId} (job ${result.job_id})`);
    return { success: true, message: `Live-monitor started on ${zone.config.shortName}`, jobId: result.job_id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    addError(`Live-monitor trigger failed for ${zoneId}: ${msg}`);
    return { success: false, message: `Failed: ${msg}` };
  }
}

/**
 * Manually trigger a live-digest job on a specific zone.
 * Uses the 1 concurrent job slot. Runs for 2 minutes.
 */
export async function triggerLiveDigest(zoneId: string): Promise<{ success: boolean; message: string }> {
  const zone = getZone(zoneId);
  if (!zone || !zone.config.streamUrl) {
    return { success: false, message: `Zone ${zoneId} not found or no stream URL` };
  }

  const budget = getTrioBudget();
  if (budget.liveMinutesUsed >= LIVE_MINUTES_DAILY_LIMIT) {
    return { success: false, message: 'Live minutes budget exhausted (30/30)' };
  }

  try {
    // Cancel any existing live jobs first
    await trio.cancelAllJobs();

    const response = await trio.startLiveDigest(zone.config.streamUrl, {
      window_minutes: 2,
      capture_interval_seconds: 30,
    });
    incrementLiveMinutes(2);

    // Consume SSE stream in background
    consumeDigestStream(zoneId, response).catch((e) =>
      console.error(`[orchestrator] Digest stream error for ${zoneId}:`, e),
    );

    console.log(`[orchestrator] Live-digest started on ${zoneId}`);
    return { success: true, message: `Live-digest started on ${zone.config.shortName} (2 min window)` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    addError(`Live-digest trigger failed for ${zoneId}: ${msg}`);
    return { success: false, message: `Failed: ${msg}` };
  }
}

// ===== Check-Once Polling =====

async function runCheckOnceCycle(): Promise<void> {
  const budget = getTrioBudget();

  // Budget check (conservative mode only)
  if (budget.mode === 'conservative' && budget.checkOnceUsed >= CHECK_ONCE_DAILY_LIMIT - 5) {
    console.log('[orchestrator] Check-once budget nearly exhausted, skipping cycle');
    return;
  }

  const zones = getEnabledZoneStates().filter((z) => z.streamOnline && z.config.streamUrl);
  if (zones.length === 0) return;

  // Pick condition for this cycle (rotate PRIMARY ↔ SWIMMERS)
  const condIdx = getConditionIndex();
  const { key, condition } = CONDITION_ROTATION[condIdx % CONDITION_ROTATION.length];
  setConditionIndex(condIdx + 1);

  if (budget.mode === 'demo') {
    // DEMO: hit ALL zones with the selected condition
    for (const zone of zones) {
      if (budget.checkOnceUsed >= CHECK_ONCE_DAILY_LIMIT) break;
      await runSingleCheckOnce(zone.config.id, zone.config.streamUrl, key, condition);
      // Small delay between calls to avoid rate limit
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  } else {
    // CONSERVATIVE: hit 1 zone (rotating)
    const zoneIdx = getZoneIndex();
    const zone = zones[zoneIdx % zones.length];
    setZoneIndex(zoneIdx + 1);
    await runSingleCheckOnce(zone.config.id, zone.config.streamUrl, key, condition);
  }
}

async function runSingleCheckOnce(
  zoneId: string,
  streamUrl: string,
  factorKey: 'highCrowdNearWaterline' | 'swimmersDetected',
  condition: string,
): Promise<void> {
  const zone = getZone(zoneId);
  if (!zone) return;

  try {
    const result = await trio.checkOnce(streamUrl, condition);
    incrementCheckOnceUsed();

    const previousValue = zone.risk.factors[factorKey];
    updateRiskFactor(zoneId, factorKey, result.triggered);
    setLastTrioCheck(zoneId);

    // Generate alert title based on factor
    const alertTitle = factorKey === 'swimmersDetected' ? 'Swimmers Detected' :
                       factorKey === 'highCrowdNearWaterline' ? 'Crowded Waterline' :
                       'Emergency Activity';

    // If state changed to triggered, add an alert
    if (result.triggered && !previousValue) {
      addAlert(zoneId, {
        id: `co-${zoneId}-${factorKey}-${Date.now()}`,
        zoneId,
        timestamp: new Date().toISOString(),
        type: 'trio_trigger',
        title: alertTitle,
        description: result.explanation,
        riskLevel: zone.risk.level,
      });
    }

    // Recompute risk
    const updatedZone = getZone(zoneId);
    if (updatedZone) {
      const newRisk = updateAndComputeRisk(
        updatedZone.risk.factors,
        {},
        updatedZone.risk.total,
      );
      updateZoneRisk(zoneId, newRisk);

      if (newRisk.level !== zone.risk.level) {
        addAlert(zoneId, {
          id: `risk-${zoneId}-${Date.now()}`,
          zoneId,
          timestamp: new Date().toISOString(),
          type: 'risk_change',
          title: `Risk Level: ${newRisk.level.toUpperCase()}`,
          description: `Risk score changed from ${zone.risk.total} to ${newRisk.total}`,
          riskLevel: newRisk.level,
        });
      }
    }

    const budget = getTrioBudget();
    console.log(`[orchestrator] check-once ${factorKey} on ${zoneId}: triggered=${result.triggered} [${budget.checkOnceUsed}/${CHECK_ONCE_DAILY_LIMIT} calls used]`);
  } catch (e) {
    console.error(`[orchestrator] check-once ${factorKey} for ${zoneId}:`, e);
  }
}

// ===== NOAA Polling =====

async function fetchNoaaForAllZones(): Promise<void> {
  const zones = getEnabledZoneStates();

  for (const zone of zones) {
    try {
      const envData = await fetchAllEnvironmental(zone.config);
      updateZoneEnvironmental(zone.config.id, envData);

      const envFactors = deriveEnvironmentalFactors(envData);
      const currentZone = getZone(zone.config.id);
      if (currentZone) {
        const newRisk = updateAndComputeRisk(
          currentZone.risk.factors,
          envFactors,
          currentZone.risk.total,
        );
        updateZoneRisk(zone.config.id, newRisk);
      }
    } catch (e) {
      console.error(`[orchestrator] NOAA fetch for ${zone.config.id}:`, e);
      addError(`NOAA fetch failed for ${zone.config.id}`);
    }
  }

  console.log('[orchestrator] NOAA data refreshed for all zones');
}

// ===== Live Digest Stream Consumer =====

async function consumeDigestStream(zoneId: string, response: Response): Promise<void> {
  if (!response.body) return;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let narrative = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n')) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.summary || data.narrative) {
              narrative = data.summary || data.narrative;
              setDigestNarrative(zoneId, narrative);

              addAlert(zoneId, {
                id: `digest-${zoneId}-${Date.now()}`,
                zoneId,
                timestamp: new Date().toISOString(),
                type: 'digest',
                title: 'Scene Summary',
                description: narrative,
                riskLevel: getZone(zoneId)?.risk.level || 'low',
              });
            }
            if (data.job_id) {
              setJobId(zoneId, 'liveDigest', data.job_id);
            }
          } catch {
            // Not valid JSON, skip
          }
        }
      }
    }
  } catch (e) {
    console.error(`[orchestrator] Digest reader error for ${zoneId}:`, e);
  }
}

// ===== Webhook Handler =====

/**
 * Handle incoming Trio webhook events.
 */
export async function handleTrioWebhook(payload: TrioWebhookPayload): Promise<void> {
  const eventType = payload.type || payload.event || 'unknown';
  const jobId = payload.job_id;

  console.log(`[orchestrator] Webhook: ${eventType} for job ${jobId}`);

  const zoneId = findZoneByJobId(jobId);

  switch (eventType) {
    case 'watch_triggered':
    case 'live_monitor_result': {
      if (!zoneId) {
        console.warn(`[orchestrator] Webhook for unknown job ${jobId}`);
        return;
      }

      const triggered = payload.data?.triggered ?? false;
      const explanation = payload.data?.explanation || '';
      const frameB64 = payload.data?.frame_b64;

      updateRiskFactor(zoneId, 'highCrowdNearWaterline', triggered);

      if (triggered) {
        addAlert(zoneId, {
          id: `wh-${zoneId}-${Date.now()}`,
          zoneId,
          timestamp: payload.timestamp || new Date().toISOString(),
          type: 'trio_trigger',
          title: 'Crowd Near Waterline',
          description: explanation,
          riskLevel: getZone(zoneId)?.risk.level || 'low',
          frameBase64: frameB64,
        });
      }

      const zone = getZone(zoneId);
      if (zone) {
        const newRisk = updateAndComputeRisk(zone.risk.factors, {}, zone.risk.total);
        updateZoneRisk(zoneId, newRisk);
      }
      break;
    }

    case 'job_status':
    case 'job_stopped': {
      // Do NOT auto-restart — live-monitor is on-demand only now
      if (zoneId) {
        console.log(`[orchestrator] Job ${jobId} stopped for zone ${zoneId} (no auto-restart)`);
        setJobId(zoneId, 'liveMonitor', null);
        setJobId(zoneId, 'liveDigest', null);
      }
      break;
    }

    case 'job_started': {
      console.log(`[orchestrator] Job ${jobId} started`);
      break;
    }

    default:
      console.log(`[orchestrator] Unhandled webhook event: ${eventType}`);
  }

  // Update active job count
  try {
    const { jobs } = await trio.listJobs({ status: 'running' });
    setActiveJobCount(jobs.length);
  } catch {
    // Non-critical
  }
}
