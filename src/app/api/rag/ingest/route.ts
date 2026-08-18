import { NextRequest, NextResponse } from 'next/server';
import { chunkText, insertDocument, insertDocumentChunks } from '@/lib/rag';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, source, metadata, embeddings } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'Both title and content are required.' },
        { status: 400 }
      );
    }

    // Insert master document
    const documentId = await insertDocument(title, source, metadata || {});

    // Chunk text
    const textChunks = chunkText(content, 300, 50);

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
        metadata: { chunkIndex: idx },
      };
    });

    await insertDocumentChunks(documentId, chunkData);

    return NextResponse.json({
      success: true,
      documentId,
      chunksCreated: chunkData.length,
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
