import { NextRequest, NextResponse } from 'next/server';
import { triggerEvent } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { zoneId, event } = body;

  if (!zoneId || !event) {
    return NextResponse.json(
      { success: false, message: 'Missing zoneId or event' },
      { status: 400 },
    );
  }

  const result = triggerEvent(zoneId, event);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
