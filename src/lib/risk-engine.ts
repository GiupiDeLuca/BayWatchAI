import { RiskFactors, RiskScore, RiskLevel, EnvironmentalData } from '@/types';

/** Weight each risk factor contributes to the total score (0-100) */
const WEIGHTS: Record<keyof RiskFactors, number> = {
  swimmersDetected: 30,
  highCrowdNearWaterline: 20,
  emergencyVehiclesVisible: 25,
  highWaveHeight: 15,
  strongWind: 10,
  extremeTide: 10,
  poorVisibility: 10,
};

/** Thresholds for environmental data → boolean risk factors */
const THRESHOLDS = {
  waveHeight: 1.5,        // meters — above this is "high"
  windSpeed: 12.86,       // m/s (≈25 knots) — above this is "strong"
  tideDeviation: 1.5,     // feet from approximate mean — above this is "extreme"
  meanTideLevel: 2.5,     // feet MLLW — approximate mean for LA/OC coast
};

/**
 * Compute a zone risk score (0-100) from risk factors.
 */
export function computeRisk(
  factors: RiskFactors,
  previousTotal: number = 0,
): RiskScore {
  let total = 0;

  for (const [key, weight] of Object.entries(WEIGHTS)) {
    if (factors[key as keyof RiskFactors]) {
      total += weight;
    }
  }

  total = Math.min(100, total);

  const level: RiskLevel =
    total <= 33 ? 'low' : total <= 66 ? 'elevated' : 'high';

  return {
    total,
    level,
    factors,
    previousTotal,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Derive environmental risk factor booleans from NOAA data.
 * These get merged into the existing risk factors.
 */
export function deriveEnvironmentalFactors(
  env: EnvironmentalData,
): Partial<RiskFactors> {
  const factors: Partial<RiskFactors> = {};

  // Wave height (from buoy, in meters)
  if (env.buoy?.waveHeight !== null && env.buoy?.waveHeight !== undefined) {
    factors.highWaveHeight = env.buoy.waveHeight > THRESHOLDS.waveHeight;
  }

  // Wind speed (from buoy or CO-OPS, in m/s)
  if (env.buoy?.windSpeed !== null && env.buoy?.windSpeed !== undefined) {
    factors.strongWind = env.buoy.windSpeed > THRESHOLDS.windSpeed;
  }

  // Tide deviation from mean
  if (env.tide?.currentLevel !== null && env.tide?.currentLevel !== undefined) {
    factors.extremeTide =
      Math.abs(env.tide.currentLevel - THRESHOLDS.meanTideLevel) >
      THRESHOLDS.tideDeviation;
  }

  // Visibility — not available from current data sources, default false
  // Could be derived from a weather API in the future
  factors.poorVisibility = false;

  return factors;
}

/**
 * Merge new partial factors into existing factors and recompute risk.
 */
export function updateAndComputeRisk(
  currentFactors: RiskFactors,
  newFactors: Partial<RiskFactors>,
  previousTotal: number,
): RiskScore {
  const merged: RiskFactors = { ...currentFactors, ...newFactors };
  return computeRisk(merged, previousTotal);
}

/**
 * Get a human-readable summary of active risk factors.
 */
export function getRiskSummary(factors: RiskFactors): string[] {
  const active: string[] = [];

  if (factors.emergencyVehiclesVisible) active.push('Emergency vehicles detected');
  if (factors.swimmersDetected) active.push('Swimmers in the water');
  if (factors.highCrowdNearWaterline) active.push('Crowded waterline');
  if (factors.highWaveHeight) active.push('High wave conditions');
  if (factors.strongWind) active.push('Strong winds');
  if (factors.extremeTide) active.push('Extreme tide');
  if (factors.poorVisibility) active.push('Poor visibility');

  return active;
}
