import { NextRequest, NextResponse } from 'next/server';
import { getZone } from '@/lib/store';
import { generateActions } from '@/lib/actions';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ zoneId: string }> },
) {
  const { zoneId } = await params;
  const zone = getZone(zoneId);

  if (!zone) {
    return NextResponse.json(
      { error: `Zone '${zoneId}' not found` },
      { status: 404 },
    );
  }

  const actions = generateActions(zoneId, zone.risk.factors);

  return NextResponse.json({
    ...zone,
    actions,
  });
}
