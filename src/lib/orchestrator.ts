import { TrioWebhookPayload } from '@/types';
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
} from './store';
import { updateAndComputeRisk, deriveEnvironmentalFactors } from './risk-engine';
import { fetchAllEnvironmental } from './noaa-client';
import * as trio from './trio-client';
import { TRIO_CONDITIONS, getEnabledZones } from './zone-config';

// ===== Timer References (on globalThis to survive HMR in dev mode) =====
interface OrchestratorGlobals {
  __bw_checkOnce?: ReturnType<typeof setInterval> | null;
  __bw_noaa?: ReturnType<typeof setInterval> | null;
  __bw_digest?: ReturnType<typeof setInterval> | null;
  __bw_digestIdx?: number;
  __bw_running?: boolean;
}
const g = globalThis as unknown as OrchestratorGlobals;

function getCheckOnceInterval() { return g.__bw_checkOnce ?? null; }
function setCheckOnceInterval(v: ReturnType<typeof setInterval> | null) { g.__bw_checkOnce = v; }
function getNoaaInterval() { return g.__bw_noaa ?? null; }
function setNoaaInterval(v: ReturnType<typeof setInterval> | null) { g.__bw_noaa = v; }
function getDigestInterval() { return g.__bw_digest ?? null; }
function setDigestInterval(v: ReturnType<typeof setInterval> | null) { g.__bw_digest = v; }
function getDigestIndex() { return g.__bw_digestIdx ?? 0; }
function setDigestIndex(v: number) { g.__bw_digestIdx = v; }
function getIsRunning() { return g.__bw_running ?? false; }
function setIsRunning(v: boolean) { g.__bw_running = v; }

// ===== Constants =====
const CHECK_ONCE_INTERVAL_MS = 60_000;    // 60 seconds (conservative to avoid rate limits)
const NOAA_INTERVAL_MS = 5 * 60_000;      // 5 minutes
const DIGEST_ROTATION_MS = 3 * 60_000;    // 3 minutes
const JOB_RESTART_DELAY_MS = 3_000;       // 3 seconds before restarting a stopped job

/**
 * Start all monitoring: live-monitor jobs, check-once polling, NOAA fetching, digest rotation.
 */
export async function startAll(): Promise<{ jobsCreated: number; message: string }> {
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

  let jobsCreated = 0;
  const webhookUrl = `${process.env.NGROK_URL}/api/webhooks/trio`;

  console.log(`[orchestrator] Starting monitoring for ${enabledZones.length} zones`);
  console.log(`[orchestrator] Webhook URL: ${webhookUrl}`);

  // 1. Mark streams with URLs as online (skip validation — Trio has no validate endpoint)
  for (const zone of enabledZones) {
    if (!zone.streamUrl) {
      console.warn(`[orchestrator] Zone ${zone.id}: no stream URL, skipping`);
      setStreamOnline(zone.id, false);
      continue;
    }
    setStreamOnline(zone.id, true);
    console.log(`[orchestrator] Zone ${zone.id}: stream URL configured, marking online`);
  }

  // 2. Start ONE live-monitor job (Trio allows 1 concurrent job)
  //    We rotate across zones using a timer. Start with the first online zone.
  const onlineZones = enabledZones.filter((z) => z.streamUrl);
  if (onlineZones.length > 0) {
    const firstZone = onlineZones[0];
    try {
      const result = await trio.startLiveMonitor(
        firstZone.streamUrl,
        TRIO_CONDITIONS.PRIMARY,
        webhookUrl,
      );
      setJobId(firstZone.id, 'liveMonitor', result.job_id);
      jobsCreated++;
      setDigestIndex(0); // track which zone has the active monitor
      console.log(`[orchestrator] Zone ${firstZone.id}: live-monitor started (job ${result.job_id})`);
    } catch (e) {
      console.error(`[orchestrator] Zone ${firstZone.id}: live-monitor failed`, e);
      addError(`Zone ${firstZone.id}: failed to start live-monitor`);
    }
  }

  // 4. Initial NOAA fetch (independent of Trio, no rate limit concerns)
  fetchNoaaForAllZones().catch((e) =>
    console.error('[orchestrator] Initial NOAA fetch failed:', e),
  );

  // 5. Start check-once polling timer (cycles through zones + conditions)
  setCheckOnceInterval(setInterval(() => {
    runCheckOnceCycle().catch((e) =>
      console.error('[orchestrator] check-once cycle error:', e),
    );
  }, CHECK_ONCE_INTERVAL_MS));

  // 6. Start NOAA polling timer
  setNoaaInterval(setInterval(() => {
    fetchNoaaForAllZones().catch((e) =>
      console.error('[orchestrator] NOAA fetch error:', e),
    );
  }, NOAA_INTERVAL_MS));

  // 7. No separate digest — use check-once for all zones since we only have 1 job slot.
  //    The live-monitor auto-restarts via webhook when it stops after 10 min.

  setActiveJobCount(jobsCreated);
  console.log(`[orchestrator] System started. ${jobsCreated} jobs, ${onlineZones.length} zones monitored via check-once polling.`);

  return { jobsCreated, message: `Monitoring ${enabledZones.length} zones` };
}

/**
 * Stop all monitoring: cancel jobs, clear timers, reset state.
 */
export async function stopAll(): Promise<void> {
  const ci = getCheckOnceInterval();
  const ni = getNoaaInterval();
  const di = getDigestInterval();
  if (ci) clearInterval(ci);
  if (ni) clearInterval(ni);
  if (di) clearInterval(di);
  setCheckOnceInterval(null);
  setNoaaInterval(null);
  setDigestInterval(null);
  setIsRunning(false);

  // Cancel all running Trio jobs
  try {
    const cancelled = await trio.cancelAllJobs();
    console.log(`[orchestrator] Stopped. Cancelled ${cancelled} jobs.`);
  } catch (e) {
    console.error('[orchestrator] Error cancelling jobs:', e);
  }

  // Reset in-memory state for clean restart
  resetState();
}

// ===== Live Monitor Restart =====

async function restartLiveMonitor(zoneId: string, attempt = 1): Promise<void> {
  const MAX_RETRIES = 3;
  const zone = getZone(zoneId);
  if (!zone || !zone.config.streamUrl || !zone.streamOnline) return;

  const webhookUrl = `${process.env.NGROK_URL}/api/webhooks/trio`;

  // Exponential backoff: 3s, 6s, 12s
  const delay = JOB_RESTART_DELAY_MS * Math.pow(2, attempt - 1);
  await new Promise((resolve) => setTimeout(resolve, delay));

  try {
    const result = await trio.startLiveMonitor(
      zone.config.streamUrl,
      TRIO_CONDITIONS.PRIMARY,
      webhookUrl,
    );
    setJobId(zoneId, 'liveMonitor', result.job_id);
    console.log(`[orchestrator] Zone ${zoneId}: live-monitor restarted (job ${result.job_id}, attempt ${attempt})`);
  } catch (e) {
    console.error(`[orchestrator] Zone ${zoneId}: restart failed (attempt ${attempt})`, e);
    if (attempt < MAX_RETRIES) {
      console.log(`[orchestrator] Zone ${zoneId}: retrying in ${delay * 2}ms...`);
      restartLiveMonitor(zoneId, attempt + 1).catch(() => {});
    } else {
      addError(`Zone ${zoneId}: live-monitor restart failed after ${MAX_RETRIES} attempts`);
    }
  }
}

// ===== Check-Once Polling =====

async function runCheckOnceCycle(): Promise<void> {
  const zones = getEnabledZoneStates().filter((z) => z.streamOnline && z.config.streamUrl);

  for (const zone of zones) {
    // All zones get supplementary condition checks.
    // Zones WITHOUT a live-monitor also get the primary crowd condition via check-once.
    const conditions: { key: 'swimmersDetected' | 'emergencyVehiclesVisible' | 'highCrowdNearWaterline'; condition: string }[] = [
      { key: 'swimmersDetected', condition: TRIO_CONDITIONS.SWIMMERS },
      { key: 'emergencyVehiclesVisible', condition: TRIO_CONDITIONS.EMERGENCY },
    ];

    // If this zone doesn't have an active live-monitor, also check the primary condition
    if (!zone.liveMonitorJobId) {
      conditions.unshift({ key: 'highCrowdNearWaterline', condition: TRIO_CONDITIONS.PRIMARY });
    }

    for (const { key, condition } of conditions) {
      try {
        const result = await trio.checkOnce(zone.config.streamUrl, condition);
        const previousValue = zone.risk.factors[key];

        updateRiskFactor(zone.config.id, key, result.triggered);
        setLastTrioCheck(zone.config.id);

        // If state changed, add an alert
        if (result.triggered && !previousValue) {
          const alertId = `co-${zone.config.id}-${key}-${Date.now()}`;
          addAlert(zone.config.id, {
            id: alertId,
            zoneId: zone.config.id,
            timestamp: new Date().toISOString(),
            type: 'trio_trigger',
            title: key === 'swimmersDetected' ? 'Swimmers Detected' : 'Emergency Activity',
            description: result.explanation,
            riskLevel: zone.risk.level,
          });
        }

        // Recompute risk
        const updatedZone = getZone(zone.config.id);
        if (updatedZone) {
          const newRisk = updateAndComputeRisk(
            updatedZone.risk.factors,
            {},
            updatedZone.risk.total,
          );
          updateZoneRisk(zone.config.id, newRisk);

          // If risk level changed, add alert
          if (newRisk.level !== zone.risk.level) {
            addAlert(zone.config.id, {
              id: `risk-${zone.config.id}-${Date.now()}`,
              zoneId: zone.config.id,
              timestamp: new Date().toISOString(),
              type: 'risk_change',
              title: `Risk Level: ${newRisk.level.toUpperCase()}`,
              description: `Risk score changed from ${zone.risk.total} to ${newRisk.total}`,
              riskLevel: newRisk.level,
            });
          }
        }

        // Delay between API calls to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (e) {
        console.error(`[orchestrator] check-once ${key} for ${zone.config.id}:`, e);
      }
    }
  }
}

// ===== NOAA Polling =====

async function fetchNoaaForAllZones(): Promise<void> {
  const zones = getEnabledZoneStates();

  for (const zone of zones) {
    try {
      const envData = await fetchAllEnvironmental(zone.config);
      updateZoneEnvironmental(zone.config.id, envData);

      // Derive environmental risk factors and recompute risk
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

// ===== Live Digest Rotation =====

async function rotateDigest(): Promise<void> {
  const zones = getEnabledZoneStates().filter((z) => z.streamOnline && z.config.streamUrl);
  if (zones.length === 0) return;

  // Cancel current digest job if running
  for (const zone of zones) {
    if (zone.liveDigestJobId) {
      try {
        await trio.cancelJob(zone.liveDigestJobId);
      } catch {
        // Job may already be stopped
      }
      setJobId(zone.config.id, 'liveDigest', null);
    }
  }

  // Advance to next zone
  const nextIdx = (getDigestIndex() + 1) % zones.length;
  setDigestIndex(nextIdx);
  const targetZone = zones[nextIdx];

  try {
    const response = await trio.startLiveDigest(targetZone.config.streamUrl, {
      window_minutes: 3,
      capture_interval_seconds: 30,
    });

    // Consume SSE stream in background
    consumeDigestStream(targetZone.config.id, response).catch((e) =>
      console.error(`[orchestrator] Digest stream error for ${targetZone.config.id}:`, e),
    );

    console.log(`[orchestrator] Digest rotated to zone: ${targetZone.config.id}`);
  } catch (e) {
    console.error(`[orchestrator] Failed to start digest for ${targetZone.config.id}:`, e);
    addError(`Digest start failed for ${targetZone.config.id}`);
  }
}

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

              // Add digest alert
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
 * Called by the /api/webhooks/trio route.
 */
export async function handleTrioWebhook(payload: TrioWebhookPayload): Promise<void> {
  const eventType = payload.type || payload.event || 'unknown';
  const jobId = payload.job_id;

  console.log(`[orchestrator] Webhook: ${eventType} for job ${jobId}`);

  // Find which zone this job belongs to
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

      // Update the primary condition factor
      updateRiskFactor(zoneId, 'highCrowdNearWaterline', triggered);

      // Add alert if triggered
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

      // Recompute risk
      const zone = getZone(zoneId);
      if (zone) {
        const newRisk = updateAndComputeRisk(zone.risk.factors, {}, zone.risk.total);
        updateZoneRisk(zoneId, newRisk);
      }
      break;
    }

    case 'job_status':
    case 'job_stopped': {
      if (payload.auto_stopped && zoneId) {
        console.log(`[orchestrator] Job ${jobId} auto-stopped for zone ${zoneId}, restarting...`);
        restartLiveMonitor(zoneId).catch((e) =>
          console.error(`[orchestrator] Restart failed for ${zoneId}:`, e),
        );
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
