import { NextRequest, NextResponse } from 'next/server';
import { resolveAction } from '@/lib/store';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { actionId } = body;

  if (!actionId) {
    return NextResponse.json(
      { success: false, message: 'Missing actionId' },
      { status: 400 },
    );
  }

  resolveAction(actionId);

  return NextResponse.json({ success: true, message: `Action ${actionId} resolved` });
}
