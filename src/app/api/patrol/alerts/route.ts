import { NextRequest, NextResponse } from 'next/server';
import { getZone, getResolvedActionIds } from '@/lib/store';
import { generateActions } from '@/lib/actions';
import type { PatrolAlert } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/patrol/alerts?zone=venice&since=2024-01-01T00:00:00.000Z
 * Returns recent alerts for a specific zone, filtered by timestamp.
 * Used by the /patrol mobile view.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const zoneId = searchParams.get('zone');
  const since = searchParams.get('since');

  if (!zoneId) {
    return NextResponse.json(
      { error: 'Missing required query param: zone' },
      { status: 400 },
    );
  }

  const zone = getZone(zoneId);
  if (!zone) {
    return NextResponse.json(
      { error: `Zone '${zoneId}' not found` },
      { status: 404 },
    );
  }

  // Filter alerts by timestamp if 'since' is provided
  let alerts = zone.alerts;
  if (since) {
    const sinceDate = new Date(since);
    alerts = alerts.filter((a) => new Date(a.timestamp) > sinceDate);
  }

  // Generate current actions for context
  const actions = generateActions(zoneId, zone.risk.factors);

  // Map to patrol-friendly format
  const patrolAlerts: PatrolAlert[] = alerts.map((alert) => ({
    id: alert.id,
    zoneId: alert.zoneId,
    zoneName: zone.config.name,
    timestamp: alert.timestamp,
    type: alert.type,
    title: alert.title,
    description: alert.description,
    riskLevel: alert.riskLevel,
    riskScore: zone.risk.total,
    actions,
  }));

  return NextResponse.json({
    zone: {
      id: zone.config.id,
      name: zone.config.name,
      riskLevel: zone.risk.level,
      riskScore: zone.risk.total,
      streamOnline: zone.streamOnline,
    },
    alerts: patrolAlerts,
    actions,
    resolvedActionIds: getResolvedActionIds(),
  });
}
