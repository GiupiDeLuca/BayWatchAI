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
} from './store';
import { updateAndComputeRisk, deriveEnvironmentalFactors } from './risk-engine';
import { fetchAllEnvironmental } from './noaa-client';
import * as trio from './trio-client';
import { TRIO_CONDITIONS, getEnabledZones } from './zone-config';

// ===== Timer References =====
let checkOnceIntervalId: ReturnType<typeof setInterval> | null = null;
let noaaIntervalId: ReturnType<typeof setInterval> | null = null;
let digestRotationIntervalId: ReturnType<typeof setInterval> | null = null;
let currentDigestZoneIndex = 0;
let isRunning = false;

// ===== Constants =====
const CHECK_ONCE_INTERVAL_MS = 45_000;    // 45 seconds
const NOAA_INTERVAL_MS = 5 * 60_000;      // 5 minutes
const DIGEST_ROTATION_MS = 3 * 60_000;    // 3 minutes
const JOB_RESTART_DELAY_MS = 3_000;       // 3 seconds before restarting a stopped job

/**
 * Start all monitoring: live-monitor jobs, check-once polling, NOAA fetching, digest rotation.
 */
export async function startAll(): Promise<{ jobsCreated: number; message: string }> {
  if (isRunning) {
    return { jobsCreated: 0, message: 'Already running' };
  }
  isRunning = true;
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

  // 1. Validate and prepare streams
  for (const zone of enabledZones) {
    if (!zone.streamUrl) {
      console.warn(`[orchestrator] Zone ${zone.id}: no stream URL, skipping`);
      setStreamOnline(zone.id, false);
      continue;
    }

    try {
      const validation = await trio.validateStream(zone.streamUrl);
      setStreamOnline(zone.id, validation.is_live);
      if (!validation.is_live) {
        addError(`Zone ${zone.id}: stream not live — ${validation.error_hint || 'unknown reason'}`);
        continue;
      }

      // Prepare stream for embed URL
      try {
        const prepared = await trio.prepareStream(zone.streamUrl);
        // Store embed URL on the zone config (mutating in-memory)
        zone.embedUrl = prepared.embed_url;
      } catch (e) {
        console.warn(`[orchestrator] Zone ${zone.id}: prepare-stream failed, using direct URL`, e);
      }
    } catch (e) {
      console.error(`[orchestrator] Zone ${zone.id}: validate-stream failed`, e);
      setStreamOnline(zone.id, false);
      addError(`Zone ${zone.id}: stream validation failed`);
      continue;
    }
  }

  // 2. Start live-monitor jobs (1 per zone with an online stream)
  for (const zone of enabledZones) {
    const zoneState = getZone(zone.id);
    if (!zoneState?.streamOnline || !zone.streamUrl) continue;

    try {
      const result = await trio.startLiveMonitor(
        zone.streamUrl,
        TRIO_CONDITIONS.PRIMARY,
        webhookUrl,
      );
      setJobId(zone.id, 'liveMonitor', result.job_id);
      jobsCreated++;
      console.log(`[orchestrator] Zone ${zone.id}: live-monitor started (job ${result.job_id})`);
    } catch (e) {
      console.error(`[orchestrator] Zone ${zone.id}: live-monitor failed`, e);
      addError(`Zone ${zone.id}: failed to start live-monitor`);
    }
  }

  // 3. Initial NOAA fetch
  fetchNoaaForAllZones().catch((e) =>
    console.error('[orchestrator] Initial NOAA fetch failed:', e),
  );

  // 4. Start check-once polling timer
  checkOnceIntervalId = setInterval(() => {
    runCheckOnceCycle().catch((e) =>
      console.error('[orchestrator] check-once cycle error:', e),
    );
  }, CHECK_ONCE_INTERVAL_MS);

  // 5. Start NOAA polling timer
  noaaIntervalId = setInterval(() => {
    fetchNoaaForAllZones().catch((e) =>
      console.error('[orchestrator] NOAA fetch error:', e),
    );
  }, NOAA_INTERVAL_MS);

  // 6. Start digest rotation timer
  digestRotationIntervalId = setInterval(() => {
    rotateDigest().catch((e) =>
      console.error('[orchestrator] Digest rotation error:', e),
    );
  }, DIGEST_ROTATION_MS);

  // 7. Start first digest
  rotateDigest().catch((e) =>
    console.error('[orchestrator] Initial digest failed:', e),
  );

  setActiveJobCount(jobsCreated);
  console.log(`[orchestrator] System started. ${jobsCreated} jobs created.`);

  return { jobsCreated, message: `Monitoring ${enabledZones.length} zones` };
}

/**
 * Stop all monitoring: cancel jobs, clear timers, reset state.
 */
export async function stopAll(): Promise<void> {
  if (checkOnceIntervalId) clearInterval(checkOnceIntervalId);
  if (noaaIntervalId) clearInterval(noaaIntervalId);
  if (digestRotationIntervalId) clearInterval(digestRotationIntervalId);
  checkOnceIntervalId = null;
  noaaIntervalId = null;
  digestRotationIntervalId = null;
  isRunning = false;

  // Cancel all running Trio jobs
  try {
    const cancelled = await trio.cancelAllJobs();
    console.log(`[orchestrator] Stopped. Cancelled ${cancelled} jobs.`);
  } catch (e) {
    console.error('[orchestrator] Error cancelling jobs:', e);
  }
}

// ===== Live Monitor Restart =====

async function restartLiveMonitor(zoneId: string): Promise<void> {
  const zone = getZone(zoneId);
  if (!zone || !zone.config.streamUrl || !zone.streamOnline) return;

  const webhookUrl = `${process.env.NGROK_URL}/api/webhooks/trio`;

  // Brief delay before restarting
  await new Promise((resolve) => setTimeout(resolve, JOB_RESTART_DELAY_MS));

  try {
    const result = await trio.startLiveMonitor(
      zone.config.streamUrl,
      TRIO_CONDITIONS.PRIMARY,
      webhookUrl,
    );
    setJobId(zoneId, 'liveMonitor', result.job_id);
    console.log(`[orchestrator] Zone ${zoneId}: live-monitor restarted (job ${result.job_id})`);
  } catch (e) {
    console.error(`[orchestrator] Zone ${zoneId}: restart failed`, e);
    addError(`Zone ${zoneId}: live-monitor restart failed`);
  }
}

// ===== Check-Once Polling =====

async function runCheckOnceCycle(): Promise<void> {
  const zones = getEnabledZoneStates().filter((z) => z.streamOnline && z.config.streamUrl);

  for (const zone of zones) {
    const conditions = [
      { key: 'swimmersDetected' as const, condition: TRIO_CONDITIONS.SWIMMERS },
      { key: 'emergencyVehiclesVisible' as const, condition: TRIO_CONDITIONS.EMERGENCY },
    ];

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

        // Small delay between API calls to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 1000));
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
  currentDigestZoneIndex = (currentDigestZoneIndex + 1) % zones.length;
  const targetZone = zones[currentDigestZoneIndex];

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
