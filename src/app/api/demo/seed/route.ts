import { NextResponse } from 'next/server';
import { seedDemoData } from '@/lib/demo-data';

export const dynamic = 'force-dynamic';

export async function POST() {
  const result = seedDemoData();
  return NextResponse.json(result);
}
