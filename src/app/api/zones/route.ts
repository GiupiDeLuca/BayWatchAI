import { NextResponse } from 'next/server';
import { getEnabledZoneStates, getState } from '@/lib/store';
import { generateActions } from '@/lib/actions';
import type { ZonesApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const systemState = getState();
  const zones = getEnabledZoneStates();

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
    },
  };

  return NextResponse.json(response);
}
