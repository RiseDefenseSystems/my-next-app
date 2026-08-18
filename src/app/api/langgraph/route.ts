import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@langchain/langgraph-sdk';
import { querySimilarChunks } from '@/lib/rag';

const LANGGRAPH_API_URL = process.env.LANGGRAPH_API_URL || 'http://127.0.0.1:2024';

export async function POST(req: NextRequest) {
  try {
    const { prompt, threadId } = await req.json();

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt string is required.' },
        { status: 400 }
      );
    }

    // 1. Vector Search in Neon Postgres for RAG context
    const mockVector = Array.from({ length: 1536 }, (_, i) => Math.sin(i));
    const ragMatches = await querySimilarChunks(mockVector, 0.0, 3);
    const ragContext = ragMatches
      .map((m, i) => `[Source ${i + 1} (${m.similarity * 100}% match)]: ${m.content}`)
      .join('\n\n');

    const augmentedPrompt = `Context from Neon Postgres RAG:\n${ragContext}\n\nUser Question:\n${prompt}`;

    // 2. Query LangGraph Dev Server
    const client = new Client({ apiUrl: LANGGRAPH_API_URL });

    // Ensure thread exists or create new thread
    let activeThreadId = threadId;
    if (!activeThreadId) {
      const thread = await client.threads.create();
      activeThreadId = thread.thread_id;
    }

    // Run graph "agent"
    const run = await client.runs.create(activeThreadId, 'agent', {
      input: {
        messages: [{ role: 'user', content: augmentedPrompt }]
      }
    });

    // Wait for completion or return run info
    const finalRun = await client.runs.join(activeThreadId, run.run_id);

    const finalRunStatus = (finalRun as { status?: string })?.status || 'completed';

    return NextResponse.json({
      success: true,
      threadId: activeThreadId,
      runId: run.run_id,
      status: finalRunStatus,
      ragMatches,
      output: finalRun,
    });
  } catch (error: unknown) {
    console.error('Error in /api/langgraph:', error);
    const message = error instanceof Error ? error.message : 'Failed to connect to LangGraph server';
    return NextResponse.json(
      { error: message, hint: 'Ensure LangGraph dev server is running on http://127.0.0.1:2024' },
      { status: 500 }
    );
  }
}
