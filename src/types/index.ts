// ===== Zone Configuration =====

export interface ZoneConfig {
  id: string;
  name: string;
  shortName: string;
  streamUrl: string;
  embedUrl?: string;
  enabled: boolean;
  lat: number;
  lng: number;
  noaa: {
    buoyStationId: string;
    tideStationId: string;
  };
  mapPosition: { x: number; y: number };
}

// ===== Risk Model =====

export type RiskLevel = 'low' | 'elevated' | 'high';

export interface RiskFactors {
  swimmersDetected: boolean;
  highCrowdNearWaterline: boolean;
  emergencyVehiclesVisible: boolean;
  highWaveHeight: boolean;
  strongWind: boolean;
  extremeTide: boolean;
  poorVisibility: boolean;
}

export interface RiskScore {
  total: number;
  level: RiskLevel;
  factors: RiskFactors;
  previousTotal: number;
  computedAt: string;
}

// ===== Environmental Data (NOAA) =====

export interface BuoyData {
  stationId: string;
  waveHeight: number | null;
  wavePeriod: number | null;
  windSpeed: number | null;
  windDirection: number | null;
  waterTemp: number | null;
  airTemp: number | null;
  fetchedAt: string;
}

export interface TidePrediction {
  time: string;
  level: number;
  type: 'H' | 'L';
}

export interface TideData {
  stationId: string;
  currentLevel: number | null;
  predictions: TidePrediction[];
  tideState: 'rising' | 'falling' | 'unknown';
  fetchedAt: string;
}

export interface EnvironmentalData {
  buoy: BuoyData | null;
  tide: TideData | null;
}

// ===== Trio API Types =====

export interface TrioCheckOnceRequest {
  stream_url: string;
  condition: string;
}

export interface TrioCheckOnceResponse {
  triggered: boolean;
  explanation: string;
  latency_ms: number;
}

export interface TrioLiveMonitorRequest {
  stream_url: string;
  condition: string;
  webhook_url: string;
}

export interface TrioLiveMonitorResponse {
  job_id: string;
  status: string;
}

export interface TrioWebhookPayload {
  type?: string;
  event?: string;
  job_id: string;
  stream_url?: string;
  timestamp?: string;
  data?: {
    condition?: string;
    triggered?: boolean;
    explanation?: string;
    prefilter_skipped?: boolean;
    frame_b64?: string;
  };
  // Job status fields
  status?: string;
  checks_performed?: number;
  triggers_fired?: number;
  frames_skipped?: number;
  auto_stopped?: boolean;
  reason?: string;
  elapsed_seconds?: number;
}

export interface TrioJobInfo {
  job_id: string;
  status: 'pending' | 'running' | 'stopped' | 'completed' | 'failed';
  job_type: 'live-monitor' | 'live-digest';
  stream_url: string;
  created_at: string;
  config?: {
    condition?: string;
    interval_seconds?: number;
    webhook_url?: string;
    window_minutes?: number;
    capture_interval_seconds?: number;
  };
  stats?: {
    checks_performed: number;
    triggers_fired: number;
    frames_skipped: number;
    summaries_generated?: number;
    auto_stopped: boolean;
    reason?: string;
    elapsed_seconds?: number;
  };
}

export interface TrioStreamValidation {
  valid: boolean;
  is_live: boolean;
  platform: string;
  stream_id?: string;
  title?: string;
  channel?: string;
  thumbnail_url?: string;
  viewer_count?: number;
  error_hint?: string;
}

export interface TrioPrepareStreamResponse {
  success: boolean;
  message: string;
  cached: boolean;
  embed_url: string;
  embed_type: 'iframe' | 'video' | 'rtsp';
}

// ===== Alert / Feed Entries =====

export interface AlertEntry {
  id: string;
  zoneId: string;
  timestamp: string;
  type: 'trio_trigger' | 'risk_change' | 'digest' | 'environmental' | 'system';
  title: string;
  description: string;
  riskLevel: RiskLevel;
  frameBase64?: string;
  metadata?: Record<string, unknown>;
}

// ===== Zone State (In-Memory Store) =====

export interface ZoneState {
  config: ZoneConfig;
  risk: RiskScore;
  environmental: EnvironmentalData;
  liveMonitorJobId: string | null;
  liveDigestJobId: string | null;
  latestDigestNarrative: string | null;
  latestDigestAt: string | null;
  streamOnline: boolean;
  lastTrioCheckAt: string | null;
  alerts: AlertEntry[];
}

export interface SystemState {
  initialized: boolean;
  startedAt: string | null;
  zones: Record<string, ZoneState>;
  activeJobCount: number;
  errors: string[];
}

// ===== Suggested Actions =====

export type ActionPriority = 'urgent' | 'warning' | 'info';

export interface SuggestedAction {
  id: string;
  zoneId: string;
  priority: ActionPriority;
  title: string;
  description: string;
  icon: string;
  triggeredBy: (keyof RiskFactors)[];
}

// ===== API Response Types =====

export interface ZonesApiResponse {
  zones: ZoneState[];
  system: {
    initialized: boolean;
    startedAt: string | null;
    activeJobCount: number;
  };
}

export interface PatrolAlert {
  id: string;
  zoneId: string;
  zoneName: string;
  timestamp: string;
  type: AlertEntry['type'];
  title: string;
  description: string;
  riskLevel: RiskLevel;
  riskScore: number;
  actions: SuggestedAction[];
}
