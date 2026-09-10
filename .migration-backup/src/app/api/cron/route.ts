import { NextRequest, NextResponse } from 'next/server';

/**
 * Top-level cron orchestrator.
 * Triggered daily at 10:00 UTC by Vercel Cron (see vercel.json).
 *
 * 1. Verifies the request is legitimately from Vercel Cron
 * 2. Triggers the LangGraph RevOps workflow via HTTP
 * 3. Returns the result to Vercel
 *
 * Required env vars:
 *  - CRON_SECRET        — shared secret set in Vercel dashboard
 *  - LANGGRAPH_API_URL  — base URL of your LangGraph server
 *  - LANGGRAPH_API_KEY  — (optional) if your LangGraph server requires auth
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  const cronSecret = process.env.CRON_SECRET;

  // 1. Verify the request is legitimately from Vercel Cron
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // 2. Trigger the LangGraph workflow
  try {
    const langgraphUrl = process.env.LANGGRAPH_API_URL;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // If your LangGraph server requires its own API key, add it here:
    const langgraphApiKey = process.env.LANGGRAPH_API_KEY;
    if (langgraphApiKey) {
      headers['Authorization'] = `Bearer ${langgraphApiKey}`;
    }

    // Adjust the endpoint path (/run-workflow) and method (POST/GET) as needed
    const response = await fetch(`${langgraphUrl}/run-workflow`, {
      method: 'POST',
      headers,
      // Pass any required payload for your AI automation
      body: JSON.stringify({ trigger: 'scheduled_revops_sync' }),
    });

    if (!response.ok) {
      throw new Error(`LangGraph API responded with status: ${response.status}`);
    }

    const data = await response.json() as Record<string, unknown>;

    // 3. Return success to Vercel
    return NextResponse.json({
      ok: true,
      message: 'RevOps workflow triggered successfully',
      data,
    });
  } catch (error: unknown) {
    console.error('Error triggering LangGraph RevOps pipeline:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
