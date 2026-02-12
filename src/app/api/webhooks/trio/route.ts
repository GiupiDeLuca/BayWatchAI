import { NextRequest, NextResponse } from 'next/server';
import { TrioWebhookPayload } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/trio
 * Receives webhook events from Trio API.
 * 
 * Event types:
 * - watch_triggered / live_monitor_result: condition was checked (may or may not have triggered)
 * - job_status / job_stopped / job_started: job lifecycle events
 * 
 * Must respond quickly (< 5 seconds). Heavy processing is fire-and-forget.
 */
export async function POST(request: NextRequest) {
  let payload: TrioWebhookPayload;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  console.log('[webhook] Received:', JSON.stringify(payload).slice(0, 200));

  // Fire-and-forget: import orchestrator and handle async
  // This ensures we respond to Trio within the timeout
  handleWebhookAsync(payload).catch((err) => {
    console.error('[webhook] Handler error:', err);
  });

  return NextResponse.json({ received: true });
}

async function handleWebhookAsync(payload: TrioWebhookPayload): Promise<void> {
  try {
    const { handleTrioWebhook } = await import('@/lib/orchestrator');
    await handleTrioWebhook(payload);
  } catch (err) {
    console.error('[webhook] Orchestrator handler failed:', err);
  }
}
