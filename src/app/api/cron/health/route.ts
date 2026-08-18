import { NextResponse } from 'next/server';

/**
 * Simple cron health-check endpoint.
 * Verifies the cron infrastructure is reachable before the full RevOps
 * pipeline runs. No auth required — returns no sensitive data.
 *
 * GET /api/cron/health
 */
export async function GET() {
  return NextResponse.json(
    { ok: true, message: 'Hello Cron!' },
    { status: 200 }
  );
}
