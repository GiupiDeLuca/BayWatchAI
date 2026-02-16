import { NextRequest, NextResponse } from 'next/server';
import { triggerEvent } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { zoneId, event } = body;

  // Handle orchestrator-level triggers (no zoneId required for mode switches)
  if (event === 'demo-mode-start' || event === 'demo-mode-stop') {
    const { startDemoMode, stopDemoMode } = await import('@/lib/orchestrator');
    const result = event === 'demo-mode-start' ? startDemoMode() : stopDemoMode();
    return NextResponse.json(result);
  }

  // Handle live-monitor and live-digest triggers (require zoneId)
  if (event === 'live-monitor' || event === 'live-digest') {
    if (!zoneId) {
      return NextResponse.json(
        { success: false, message: 'Missing zoneId for live trigger' },
        { status: 400 },
      );
    }
    const { triggerLiveMonitor, triggerLiveDigest } = await import('@/lib/orchestrator');
    const result = event === 'live-monitor'
      ? await triggerLiveMonitor(zoneId)
      : await triggerLiveDigest(zoneId);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  }

  // Original demo event triggers
  if (!zoneId || !event) {
    return NextResponse.json(
      { success: false, message: 'Missing zoneId or event' },
      { status: 400 },
    );
  }

  const result = triggerEvent(zoneId, event);
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
