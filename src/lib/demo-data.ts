import { getEnabledZoneStates, updateZoneRisk, addAlert } from './store';
import { computeRisk } from './risk-engine';
import type { RiskFactors, AlertEntry } from '@/types';

let alertCounter = 1000;

function makeAlert(
  zoneId: string,
  type: AlertEntry['type'],
  title: string,
  description: string,
  riskLevel: AlertEntry['riskLevel'],
  minutesAgo: number,
): AlertEntry {
  return {
    id: `demo-${++alertCounter}`,
    zoneId,
    timestamp: new Date(Date.now() - minutesAgo * 60_000).toISOString(),
    type,
    title,
    description,
    riskLevel,
  };
}

/**
 * Seed realistic demo data into all enabled zones.
 * Creates varied risk levels and a realistic alert history.
 */
export function seedDemoData(): { seeded: boolean; zones: string[] } {
  const zones = getEnabledZoneStates();
  const zoneIds = zones.map((z) => z.config.id);

  // Zone 0: elevated risk — swimmers + high crowd
  if (zones[0]) {
    const factors: RiskFactors = {
      swimmersDetected: true,
      highCrowdNearWaterline: true,
      emergencyVehiclesVisible: false,
      highWaveHeight: false,
      strongWind: false,
      extremeTide: false,
      poorVisibility: false,
    };
    const risk = computeRisk(factors, 0);
    updateZoneRisk(zoneIds[0], risk);

    addAlert(zoneIds[0], makeAlert(zoneIds[0], 'trio_trigger', 'Swimmers Detected',
      'AI vision detected multiple people swimming past the wave break in the southern section.', 'elevated', 3));
    addAlert(zoneIds[0], makeAlert(zoneIds[0], 'trio_trigger', 'Crowded Waterline',
      'Large group of beachgoers concentrated near the waterline, approximately 40-50 people within 20ft of surf.', 'elevated', 8));
    addAlert(zoneIds[0], makeAlert(zoneIds[0], 'environmental', 'NOAA Data Update',
      'Wave height 4.3ft at 12s period. Water temperature 62\u00B0F. Tide falling.', 'low', 15));
    addAlert(zoneIds[0], makeAlert(zoneIds[0], 'system', 'Live Monitor Active',
      'Trio AI vision monitoring started for this zone. Checking for crowd activity every 30 seconds.', 'low', 25));
  }

  // Zone 1: high risk — swimmers + high waves + emergency
  if (zones[1]) {
    const factors: RiskFactors = {
      swimmersDetected: true,
      highCrowdNearWaterline: false,
      emergencyVehiclesVisible: true,
      highWaveHeight: true,
      strongWind: false,
      extremeTide: false,
      poorVisibility: false,
    };
    const risk = computeRisk(factors, 20);
    updateZoneRisk(zoneIds[1], risk);

    addAlert(zoneIds[1], makeAlert(zoneIds[1], 'trio_trigger', 'Emergency Vehicle Spotted',
      'AI vision detected a lifeguard truck parked near tower 26. Personnel appear to be responding to an incident.', 'high', 1));
    addAlert(zoneIds[1], makeAlert(zoneIds[1], 'risk_change', 'Risk Level Elevated to HIGH',
      'Risk score increased from 20 to 70. Multiple risk factors now active: swimmers detected, high waves, emergency vehicle.', 'high', 2));
    addAlert(zoneIds[1], makeAlert(zoneIds[1], 'trio_trigger', 'Swimmers in High Surf',
      'Detected 3-4 swimmers in the water during elevated wave conditions. Waves measured at 5.1ft.', 'high', 5));
    addAlert(zoneIds[1], makeAlert(zoneIds[1], 'environmental', 'High Surf Warning',
      'NOAA buoy reporting wave height exceeding 1.5m threshold. Current: 1.55m at 14s period.', 'elevated', 12));
    addAlert(zoneIds[1], makeAlert(zoneIds[1], 'digest', 'AI Scene Summary',
      'Moderate beach activity with approximately 100 people visible. Several groups near the water. One lifeguard vehicle on patrol. Surf appears choppy with occasional larger sets.', 'elevated', 18));
  }

  // Zone 2: low risk — calm conditions
  if (zones[2]) {
    const factors: RiskFactors = {
      swimmersDetected: false,
      highCrowdNearWaterline: false,
      emergencyVehiclesVisible: false,
      highWaveHeight: false,
      strongWind: false,
      extremeTide: false,
      poorVisibility: false,
    };
    const risk = computeRisk(factors, 0);
    updateZoneRisk(zoneIds[2], risk);

    addAlert(zoneIds[2], makeAlert(zoneIds[2], 'environmental', 'NOAA Data Update',
      'Conditions calm. Waves 2.1ft at 10s period. Light winds 3kts. Water temp 63\u00B0F.', 'low', 10));
    addAlert(zoneIds[2], makeAlert(zoneIds[2], 'system', 'Zone Monitoring Started',
      'AI vision and NOAA data feeds initialized for this zone.', 'low', 30));
  }

  return { seeded: true, zones: zoneIds };
}

/**
 * Trigger a specific event on a zone (for live demo).
 */
export function triggerEvent(
  zoneId: string,
  event: string,
): { success: boolean; message: string } {
  const zones = getEnabledZoneStates();
  const zone = zones.find((z) => z.config.id === zoneId);
  if (!zone) return { success: false, message: `Zone ${zoneId} not found` };

  const currentFactors = { ...zone.risk.factors };
  const prevTotal = zone.risk.total;

  switch (event) {
    case 'swimmers_detected':
      currentFactors.swimmersDetected = true;
      addAlert(zoneId, makeAlert(zoneId, 'trio_trigger', 'Swimmers Detected',
        'AI vision detected people swimming in the ocean past the wave break.', 'elevated', 0));
      break;

    case 'crowd_waterline':
      currentFactors.highCrowdNearWaterline = true;
      addAlert(zoneId, makeAlert(zoneId, 'trio_trigger', 'Crowded Waterline',
        'Large crowd detected near the waterline. Estimated 50+ people within surf zone proximity.', 'elevated', 0));
      break;

    case 'emergency_vehicle':
      currentFactors.emergencyVehiclesVisible = true;
      addAlert(zoneId, makeAlert(zoneId, 'trio_trigger', 'Emergency Vehicle Detected',
        'Lifeguard truck or emergency vehicle spotted in the zone. Personnel appear to be on scene.', 'high', 0));
      break;

    case 'high_waves':
      currentFactors.highWaveHeight = true;
      addAlert(zoneId, makeAlert(zoneId, 'environmental', 'High Surf Warning',
        'Wave height has exceeded the 1.5m safety threshold. Current conditions: 5.2ft at 13s period.', 'elevated', 0));
      break;

    case 'strong_wind':
      currentFactors.strongWind = true;
      addAlert(zoneId, makeAlert(zoneId, 'environmental', 'Strong Wind Advisory',
        'Wind speed exceeds 25 knots. Dangerous conditions for swimmers and small watercraft.', 'elevated', 0));
      break;

    case 'extreme_tide':
      currentFactors.extremeTide = true;
      addAlert(zoneId, makeAlert(zoneId, 'environmental', 'Extreme Tide Alert',
        'Tide level significantly deviating from mean. Enhanced rip current risk.', 'elevated', 0));
      break;

    case 'all_clear':
      currentFactors.swimmersDetected = false;
      currentFactors.highCrowdNearWaterline = false;
      currentFactors.emergencyVehiclesVisible = false;
      currentFactors.highWaveHeight = false;
      currentFactors.strongWind = false;
      currentFactors.extremeTide = false;
      addAlert(zoneId, makeAlert(zoneId, 'system', 'All Clear',
        'All risk factors have been cleared. Conditions returning to normal.', 'low', 0));
      break;

    default:
      return { success: false, message: `Unknown event: ${event}` };
  }

  const newRisk = computeRisk(currentFactors, prevTotal);
  updateZoneRisk(zoneId, newRisk);

  // Add risk change alert if level changed
  if (newRisk.level !== zone.risk.level && event !== 'all_clear') {
    addAlert(zoneId, makeAlert(zoneId, 'risk_change',
      `Risk Level: ${newRisk.level.toUpperCase()}`,
      `Risk score changed from ${prevTotal} to ${newRisk.total}. Level: ${newRisk.level}.`,
      newRisk.level, 0));
  }

  return { success: true, message: `Event '${event}' triggered on ${zoneId}. Risk: ${newRisk.total} (${newRisk.level})` };
}
