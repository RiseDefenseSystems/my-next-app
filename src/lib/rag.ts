import { getDb } from './db';

export interface DocumentChunkMatch {
  id: number;
  document_id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

/**
 * Splits text content into overlapping text chunks for vector embedding generation.
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 500,
  overlap: number = 100
): string[] {
  if (!text || text.trim().length === 0) return [];
  
  const words = text.trim().split(/\s+/);
  const chunks: string[] = [];
  let index = 0;

  while (index < words.length) {
    const chunkWords = words.slice(index, index + maxChunkSize);
    chunks.push(chunkWords.join(' '));
    index += maxChunkSize - overlap;
  }

  return chunks;
}

/**
 * Inserts a master document into Neon Postgres.
 */
export async function insertDocument(
  title: string,
  source?: string,
  metadata: Record<string, unknown> = {}
): Promise<number> {
  const sql = getDb();
  const result = await sql`
    INSERT INTO documents (title, source, metadata)
    VALUES (${title}, ${source || null}, ${JSON.stringify(metadata)})
    RETURNING id;
  `;
  return (result[0] as { id: number }).id;
}

/**
 * Inserts vector-embedded document chunks into Neon Postgres.
 */
export async function insertDocumentChunks(
  documentId: number,
  chunks: {
    content: string;
    chunkIndex: number;
    embedding: number[];
    metadata?: Record<string, unknown>;
  }[]
): Promise<void> {
  const sql = getDb();
  
  for (const chunk of chunks) {
    const vectorString = `[${chunk.embedding.join(',')}]`;
    const metadataJson = JSON.stringify(chunk.metadata || {});

    await sql`
      INSERT INTO document_chunks (document_id, content, chunk_index, embedding, metadata)
      VALUES (${documentId}, ${chunk.content}, ${chunk.chunkIndex}, ${vectorString}::vector, ${metadataJson});
    `;
  }
}

/**
 * Performs vector similarity search using the match_document_chunks SQL stored procedure in Neon.
 */
export async function querySimilarChunks(
  queryEmbedding: number[],
  matchThreshold: number = 0.5,
  matchCount: number = 5
): Promise<DocumentChunkMatch[]> {
  const sql = getDb();
  const vectorString = `[${queryEmbedding.join(',')}]`;

  const results = await sql`
    SELECT * FROM match_document_chunks(
      ${vectorString}::vector,
      ${matchThreshold}::float,
      ${matchCount}::int
    );
  `;

  return results.map((row: Record<string, unknown>) => ({
    id: Number(row.id),
    document_id: Number(row.document_id),
    content: String(row.content),
    metadata: (row.metadata as Record<string, unknown>) || {},
    similarity: Number(row.similarity),
  }));
}
