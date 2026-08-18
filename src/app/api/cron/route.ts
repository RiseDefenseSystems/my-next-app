import { NextRequest, NextResponse } from 'next/server';

/**
 * Top-level cron orchestrator.
 * Triggered once daily at 10:00 UTC by Vercel Cron (see vercel.json).
 *
 * Fans out to all cron sub-routes in parallel:
 *  - /api/cron/health   — infrastructure smoke-test
 *  - /api/cron/revops   — LangGraph RevOps pipeline + Neon DB persistence
 *
 * Authorization: Bearer <CRON_SECRET>
 * Vercel injects this header automatically on cron invocations.
 */
export async function GET(request: NextRequest) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // ── Derive the base URL from the incoming request ─────────────────────────
  // Works on Vercel (HTTPS) and locally (HTTP).
  const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;

  const subRoutes = [
    '/api/cron/health',
    '/api/cron/revops',
  ] as const;

  // ── Fan out in parallel ───────────────────────────────────────────────────
  const results = await Promise.allSettled(
    subRoutes.map(async (path) => {
      const res = await fetch(`${baseUrl}${path}`, {
        headers: {
          Authorization: `Bearer ${cronSecret}`,
        },
      });
      const body = await res.json();
      return { path, status: res.status, ok: res.ok, body };
    })
  );

  // ── Collate results ───────────────────────────────────────────────────────
  const summary = results.map((result, i) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    return {
      path: subRoutes[i],
      status: 500,
      ok: false,
      body: { error: result.reason instanceof Error ? result.reason.message : 'Unknown error' },
    };
  });

  const allOk = summary.every((r) => r.ok);

  return NextResponse.json(
    { ok: allOk, results: summary },
    { status: allOk ? 200 : 207 } // 207 Multi-Status if any sub-route failed
  );
}
