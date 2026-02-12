import { NextResponse } from 'next/server';
import { isInitialized } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/system/start
 * Initialize all monitoring jobs, timers, and data polling.
 * Idempotent: if already initialized, returns current status.
 */
export async function POST() {
  if (isInitialized()) {
    return NextResponse.json({
      status: 'already_running',
      message: 'System is already initialized',
    });
  }

  try {
    const { startAll } = await import('@/lib/orchestrator');
    const result = await startAll();

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
