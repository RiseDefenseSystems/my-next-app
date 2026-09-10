import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

/**
 * Cron-protected RevOps endpoint.
 * Triggered every 6 hours by Vercel Cron (see vercel.json).
 *
 * Flow:
 *  1. Verify request is from Vercel Cron via Bearer <CRON_SECRET>
 *  2. POST to LangGraph /run-workflow to trigger the RevOps AI pipeline
 *  3. Persist the result to Neon Postgres `revops_reports` table
 *
 * Required env vars:
 *  - CRON_SECRET        — shared secret, set in Vercel dashboard
 *  - LANGGRAPH_API_URL  — base URL of your LangGraph server
 *  - LANGGRAPH_API_KEY  — (optional) if your LangGraph server requires auth
 */
export async function GET(request: NextRequest) {
  // ── 1. Verify the request is legitimately from Vercel Cron ──────────────
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const startedAt = Date.now();

  // ── 2. Trigger the LangGraph RevOps workflow ─────────────────────────────
  try {
    const langgraphUrl = process.env.LANGGRAPH_API_URL;
    if (!langgraphUrl) {
      throw new Error('LANGGRAPH_API_URL environment variable is not set.');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Attach LangGraph API key if configured
    const langgraphApiKey = process.env.LANGGRAPH_API_KEY;
    if (langgraphApiKey) {
      headers['Authorization'] = `Bearer ${langgraphApiKey}`;
    }

    const lgResponse = await fetch(`${langgraphUrl}/run-workflow`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ trigger: 'scheduled_revops_sync' }),
    });

    if (!lgResponse.ok) {
      throw new Error(`LangGraph API responded with status: ${lgResponse.status}`);
    }

    const data = await lgResponse.json() as Record<string, unknown>;

    // ── 3. Persist the workflow result to Neon Postgres ────────────────────
    const sql = getDb();

    // Ensure table exists (idempotent — safe to run on every invocation)
    await sql`
      CREATE TABLE IF NOT EXISTS revops_reports (
        id          SERIAL PRIMARY KEY,
        trigger     TEXT        NOT NULL,
        status      TEXT        NOT NULL,
        report      JSONB       NOT NULL,
        duration_ms INTEGER     NOT NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `;

    const durationMs = Date.now() - startedAt;

    const [inserted] = await sql`
      INSERT INTO revops_reports (trigger, status, report, duration_ms)
      VALUES (
        ${'scheduled_revops_sync'},
        ${'completed'},
        ${JSON.stringify(data)},
        ${durationMs}
      )
      RETURNING id, created_at;
    ` as Array<{ id: number; created_at: string }>;

    // ── 4. Return success to Vercel ────────────────────────────────────────
    return NextResponse.json({
      ok: true,
      message: 'RevOps workflow triggered successfully',
      reportId: inserted.id,
      createdAt: inserted.created_at,
      durationMs,
      data,
    });
  } catch (error: unknown) {
    console.error('Error triggering LangGraph RevOps pipeline:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
