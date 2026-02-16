import { NextResponse } from 'next/server';
import { getEnabledZoneStates, getState, getTrioBudget } from '@/lib/store';
import { generateActions } from '@/lib/actions';
import type { ZonesApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const systemState = getState();
  const zones = getEnabledZoneStates();
  const trioBudget = getTrioBudget();

  // Attach generated actions to each zone for the response
  const zonesWithActions = zones.map((zone) => ({
    ...zone,
    actions: generateActions(zone.config.id, zone.risk.factors),
  }));

  const response: ZonesApiResponse & { zones: (typeof zonesWithActions)[number][] } = {
    zones: zonesWithActions,
    system: {
      initialized: systemState.initialized,
      startedAt: systemState.startedAt,
      activeJobCount: systemState.activeJobCount,
      trioBudget,
    },
  };

  return NextResponse.json(response);
}
