import { NextRequest, NextResponse } from 'next/server';
import { isInitialized } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/system/start
 * Initialize all monitoring jobs, timers, and data polling.
 * Pass ?force=true to restart even if already initialized.
 */
export async function POST(request: NextRequest) {
  const force = new URL(request.url).searchParams.get('force') === 'true';

  if (isInitialized() && !force) {
    return NextResponse.json({
      status: 'already_running',
      message: 'System is already initialized. Use ?force=true to restart.',
    });
  }

  try {
    const { startAll, stopAll } = await import('@/lib/orchestrator');

    // If forcing restart, stop first
    if (force) {
      try { await stopAll(); } catch { /* ignore */ }
    }

    const result = await startAll();

    // Auto-seed demo data so the dashboard looks alive immediately
    try {
      const { seedDemoData } = await import('@/lib/demo-data');
      seedDemoData();
    } catch { /* ignore seed errors */ }

    return NextResponse.json({
      status: 'started',
      ...result,
    });
  } catch (err) {
    console.error('[system/start] Failed to initialize:', err);
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 500 },
    );
  }
}
