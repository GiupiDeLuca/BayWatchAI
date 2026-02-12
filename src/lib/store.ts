import {
  SystemState,
  ZoneState,
  ZoneConfig,
  RiskScore,
  RiskFactors,
  RiskLevel,
  EnvironmentalData,
  AlertEntry,
} from '@/types';
import { ZONE_CONFIGS, getEnabledZones } from './zone-config';

// ===== Default Factories =====

function defaultRiskFactors(): RiskFactors {
  return {
    swimmersDetected: false,
    highCrowdNearWaterline: false,
    emergencyVehiclesVisible: false,
    highWaveHeight: false,
    strongWind: false,
    extremeTide: false,
    poorVisibility: false,
  };
}

function defaultRiskScore(): RiskScore {
  return {
    total: 0,
    level: 'low' as RiskLevel,
    factors: defaultRiskFactors(),
    previousTotal: 0,
    computedAt: new Date().toISOString(),
  };
}

function createZoneState(config: ZoneConfig): ZoneState {
  return {
    config,
    risk: defaultRiskScore(),
    environmental: { buoy: null, tide: null },
    liveMonitorJobId: null,
    liveDigestJobId: null,
    latestDigestNarrative: null,
    latestDigestAt: null,
    streamOnline: false,
    lastTrioCheckAt: null,
    alerts: [],
  };
}

function createInitialState(): SystemState {
  const zones: Record<string, ZoneState> = {};

  // Initialize ALL zones (enabled or not) so the config is always accessible
  for (const config of ZONE_CONFIGS) {
    zones[config.id] = createZoneState(config);
  }

  return {
    initialized: false,
    startedAt: null,
    zones,
    activeJobCount: 0,
    errors: [],
  };
}

// ===== Module-Level Singleton =====
// Persists across requests in the same Node.js process (self-hosted Next.js)

let state: SystemState = createInitialState();

const MAX_ALERTS_PER_ZONE = 50;
const MAX_ERRORS = 20;

// ===== Read Accessors =====

export function getState(): SystemState {
  return state;
}

export function getZone(zoneId: string): ZoneState | undefined {
  return state.zones[zoneId];
}

export function getAllZones(): ZoneState[] {
  return Object.values(state.zones);
}

export function getEnabledZoneStates(): ZoneState[] {
  const enabledIds = new Set(getEnabledZones().map((z) => z.id));
  return Object.values(state.zones).filter((z) => enabledIds.has(z.config.id));
}

export function isInitialized(): boolean {
  return state.initialized;
}

// ===== Write Accessors =====

export function markInitialized(): void {
  state.initialized = true;
  state.startedAt = new Date().toISOString();
}

export function updateZoneRisk(zoneId: string, risk: RiskScore): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  zone.risk = risk;
}

export function updateRiskFactor(
  zoneId: string,
  factor: keyof RiskFactors,
  value: boolean,
): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  zone.risk.factors[factor] = value;
}

export function updateZoneEnvironmental(
  zoneId: string,
  data: EnvironmentalData,
): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  zone.environmental = data;
}

export function addAlert(zoneId: string, alert: AlertEntry): void {
  const zone = state.zones[zoneId];
  if (!zone) return;

  // Add to front (newest first)
  zone.alerts.unshift(alert);

  // Trim to max
  if (zone.alerts.length > MAX_ALERTS_PER_ZONE) {
    zone.alerts = zone.alerts.slice(0, MAX_ALERTS_PER_ZONE);
  }
}

export function setJobId(
  zoneId: string,
  type: 'liveMonitor' | 'liveDigest',
  jobId: string | null,
): void {
  const zone = state.zones[zoneId];
  if (!zone) return;

  if (type === 'liveMonitor') {
    zone.liveMonitorJobId = jobId;
  } else {
    zone.liveDigestJobId = jobId;
  }
}

export function setDigestNarrative(zoneId: string, narrative: string): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  zone.latestDigestNarrative = narrative;
  zone.latestDigestAt = new Date().toISOString();
}

export function setStreamOnline(zoneId: string, online: boolean): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  zone.streamOnline = online;
}

export function setLastTrioCheck(zoneId: string): void {
  const zone = state.zones[zoneId];
  if (!zone) return;
  zone.lastTrioCheckAt = new Date().toISOString();
}

export function setActiveJobCount(count: number): void {
  state.activeJobCount = count;
}

export function addError(message: string): void {
  state.errors.unshift(`[${new Date().toISOString()}] ${message}`);
  if (state.errors.length > MAX_ERRORS) {
    state.errors = state.errors.slice(0, MAX_ERRORS);
  }
}

/** Find which zone owns a given job ID */
export function findZoneByJobId(jobId: string): string | null {
  for (const [zoneId, zone] of Object.entries(state.zones)) {
    if (zone.liveMonitorJobId === jobId || zone.liveDigestJobId === jobId) {
      return zoneId;
    }
  }
  return null;
}

/** Reset to initial state (useful for testing) */
export function resetState(): void {
  state = createInitialState();
}
