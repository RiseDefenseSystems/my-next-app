import { NextRequest, NextResponse } from 'next/server';
import { querySimilarChunks } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, queryEmbedding, topK = 5, threshold = 0.0 } = body;

    if (!query && !queryEmbedding) {
      return NextResponse.json(
        { error: 'Provide a query string or queryEmbedding vector.' },
        { status: 400 }
      );
    }

    // Determine query embedding vector (use passed embedding or deterministic vector for test)
    let embedding: number[];
    if (queryEmbedding && Array.isArray(queryEmbedding)) {
      embedding = queryEmbedding;
    } else {
      // Mock embedding vector of size 1536
      embedding = Array.from({ length: 1536 }, (_, i) => Math.sin(i));
    }

    const matches = await querySimilarChunks(embedding, threshold, topK);

    return NextResponse.json({
      success: true,
      query,
      resultsCount: matches.length,
      matches,
    });
  } catch (error: unknown) {
    console.error('Error in /api/rag/query:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
