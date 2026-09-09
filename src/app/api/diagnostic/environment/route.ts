import { NextResponse } from 'next/server';
import { runEnvironmentDiagnostic } from '@/lib/diagnostic';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const report = await runEnvironmentDiagnostic();
    return NextResponse.json(report, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute environment diagnostic';
    return NextResponse.json(
      { status: 'error', message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const report = await runEnvironmentDiagnostic();
    return NextResponse.json(report, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to execute environment diagnostic';
    return NextResponse.json(
      { status: 'error', message, timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
