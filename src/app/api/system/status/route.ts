import { NextResponse } from 'next/server';
import { getState } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * GET /api/system/status
 * Returns system health: initialization state, job counts, recent errors.
 */
export async function GET() {
  const state = getState();

  return NextResponse.json({
    initialized: state.initialized,
    startedAt: state.startedAt,
    activeJobCount: state.activeJobCount,
    totalZones: Object.keys(state.zones).length,
    enabledZones: Object.values(state.zones).filter((z) => z.config.enabled).length,
    onlineStreams: Object.values(state.zones).filter((z) => z.streamOnline).length,
    recentErrors: state.errors.slice(0, 5),
    zones: Object.values(state.zones).map((z) => ({
      id: z.config.id,
      name: z.config.name,
      enabled: z.config.enabled,
      streamOnline: z.streamOnline,
      riskLevel: z.risk.level,
      riskScore: z.risk.total,
      liveMonitorJobId: z.liveMonitorJobId,
      liveDigestJobId: z.liveDigestJobId,
      alertCount: z.alerts.length,
    })),
  });
}
