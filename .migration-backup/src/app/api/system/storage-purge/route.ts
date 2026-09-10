import { NextResponse } from 'next/server';
import { getDiskTelemetry, executeDropWeightPurge } from '@/lib/storagePurge';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const disk = await getDiskTelemetry();
    return NextResponse.json({
      status: 'ok',
      disk,
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to get storage telemetry';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}

export async function POST() {
  try {
    const report = await executeDropWeightPurge();
    return NextResponse.json(report, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute storage purge';
    return NextResponse.json({ status: 'error', message }, { status: 500 });
  }
}
