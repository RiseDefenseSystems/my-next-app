import { NextRequest, NextResponse } from 'next/server';
import { chunkText, insertDocument, insertDocumentChunks } from '@/lib/rag';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await req.json();
    const { 
      title, 
      content, 
      source, 
      metadata, 
      embeddings,
      chunkSize = 300,
      chunkOverlap = 50 
    } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Both title and content are required.' },
        { status: 400 }
      );
    }

    // Clamp chunk size & overlap to reasonable bounds
    const safeChunkSize = Math.max(50, Math.min(2000, Number(chunkSize) || 300));
    const safeChunkOverlap = Math.max(0, Math.min(Math.floor(safeChunkSize / 2), Number(chunkOverlap) || 50));

    // Insert master document
    const documentId = await insertDocument(title, source, metadata || {});

    // Chunk text using configured parameters
    const textChunks = chunkText(content, safeChunkSize, safeChunkOverlap);

    if (textChunks.length === 0) {
      return NextResponse.json(
        { error: 'Document content is empty or contains only whitespace.' },
        { status: 400 }
      );
    }

    const totalWords = content.trim().split(/\s+/).length;
    const avgWordsPerChunk = Math.round(totalWords / textChunks.length);

    // Prepare chunks with embeddings (provided or simulated 1536-dim vector for testing)
    const chunkData = textChunks.map((chunk, idx) => {
      let embedding: number[];
      if (embeddings && Array.isArray(embeddings[idx])) {
        embedding = embeddings[idx];
      } else {
        // Generate deterministic 1536-dim mock vector for demonstration/testing
        embedding = Array.from({ length: 1536 }, (_, i) => Math.sin(idx + i));
      }

      return {
        content: chunk,
        chunkIndex: idx,
        embedding,
        metadata: { 
          chunkIndex: idx,
          words: chunk.split(/\s+/).length,
          ...(metadata || {})
        },
      };
    });

    await insertDocumentChunks(documentId, chunkData);

    const elapsedMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      documentId,
      title,
      source: source || null,
      chunksCreated: chunkData.length,
      totalWords,
      averageWordsPerChunk: avgWordsPerChunk,
      chunkSize: safeChunkSize,
      chunkOverlap: safeChunkOverlap,
      sampleSnippet: textChunks[0]?.slice(0, 150) + (textChunks[0]?.length > 150 ? '...' : ''),
      elapsedMs,
    });
  } catch (error: unknown) {
    console.error('Error in /api/rag/ingest:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
