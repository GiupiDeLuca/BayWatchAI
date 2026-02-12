import { RiskFactors, SuggestedAction, ActionPriority } from '@/types';

interface ActionRule {
  condition: (f: RiskFactors) => boolean;
  priority: ActionPriority;
  title: string;
  description: string;
  icon: string;
  triggeredBy: (keyof RiskFactors)[];
}

/**
 * Action rules evaluated in priority order.
 * First matching rules take precedence.
 */
const ACTION_RULES: ActionRule[] = [
  // URGENT
  {
    condition: (f) => f.emergencyVehiclesVisible,
    priority: 'urgent',
    title: 'Emergency Activity Detected',
    description:
      'Emergency vehicles or personnel visible in zone. Contact zone lifeguard captain immediately.',
    icon: '\u{1F6A8}',
    triggeredBy: ['emergencyVehiclesVisible'],
  },
  {
    condition: (f) => f.swimmersDetected && f.highWaveHeight,
    priority: 'urgent',
    title: 'Swimmers in Dangerous Surf',
    description:
      'Active swimmers detected with high wave conditions. Consider posting red flag and deploying additional water safety personnel.',
    icon: '\u{1F3CA}',
    triggeredBy: ['swimmersDetected', 'highWaveHeight'],
  },
  {
    condition: (f) => f.swimmersDetected && f.extremeTide,
    priority: 'urgent',
    title: 'Swimmers in Extreme Tide',
    description:
      'Swimmers detected during extreme tide conditions. Increased rip current risk. Consider restricting water access.',
    icon: '\u{1F30A}',
    triggeredBy: ['swimmersDetected', 'extremeTide'],
  },

  // WARNING
  {
    condition: (f) => f.highCrowdNearWaterline && f.strongWind,
    priority: 'warning',
    title: 'High Crowd + Strong Wind Advisory',
    description:
      'Large crowd near waterline combined with strong winds. Increase patrol frequency and monitor for wind-related hazards.',
    icon: '\u{1F4A8}',
    triggeredBy: ['highCrowdNearWaterline', 'strongWind'],
  },
  {
    condition: (f) => f.highCrowdNearWaterline && f.highWaveHeight,
    priority: 'warning',
    title: 'Crowded Beach + High Surf',
    description:
      'Heavy crowd activity near waterline during high surf. Pre-position rescue equipment and increase visual surveillance.',
    icon: '\u{1F3D6}',
    triggeredBy: ['highCrowdNearWaterline', 'highWaveHeight'],
  },
  {
    condition: (f) => f.swimmersDetected,
    priority: 'warning',
    title: 'Active Swimmers Detected',
    description:
      'People observed swimming in the ocean. Maintain continuous visual surveillance of water area.',
    icon: '\u{1F6C1}',
    triggeredBy: ['swimmersDetected'],
  },
  {
    condition: (f) => f.highCrowdNearWaterline,
    priority: 'warning',
    title: 'Crowded Waterline',
    description:
      'Significant crowd activity near the waterline. Maintain elevated patrol presence.',
    icon: '\u{1F465}',
    triggeredBy: ['highCrowdNearWaterline'],
  },

  // INFO
  {
    condition: (f) => f.highWaveHeight,
    priority: 'info',
    title: 'High Surf Advisory',
    description:
      'Wave height exceeds safety threshold. Monitor conditions and prepare for potential beach advisories.',
    icon: '\u{1F30A}',
    triggeredBy: ['highWaveHeight'],
  },
  {
    condition: (f) => f.extremeTide,
    priority: 'info',
    title: 'Extreme Tide Conditions',
    description:
      'Tide level significantly deviates from mean. Watch for enhanced rip currents and shoreline changes.',
    icon: '\u{1F319}',
    triggeredBy: ['extremeTide'],
  },
  {
    condition: (f) => f.strongWind,
    priority: 'info',
    title: 'Strong Wind Advisory',
    description:
      'Wind speeds elevated. Monitor for wind-driven debris and challenging surf conditions.',
    icon: '\u{1F32C}',
    triggeredBy: ['strongWind'],
  },
];

let actionCounter = 0;

/**
 * Generate suggested actions for a zone based on its current risk factors.
 * Returns matching actions in priority order (urgent → warning → info).
 */
export function generateActions(
  zoneId: string,
  factors: RiskFactors,
): SuggestedAction[] {
  const actions: SuggestedAction[] = [];

  for (const rule of ACTION_RULES) {
    if (rule.condition(factors)) {
      actions.push({
        id: `action-${zoneId}-${++actionCounter}`,
        zoneId,
        priority: rule.priority,
        title: rule.title,
        description: rule.description,
        icon: rule.icon,
        triggeredBy: rule.triggeredBy,
      });
    }
  }

  return actions;
}

/**
 * Get the highest priority from a list of actions.
 */
export function getHighestPriority(
  actions: SuggestedAction[],
): ActionPriority | null {
  if (actions.length === 0) return null;
  if (actions.some((a) => a.priority === 'urgent')) return 'urgent';
  if (actions.some((a) => a.priority === 'warning')) return 'warning';
  return 'info';
}
