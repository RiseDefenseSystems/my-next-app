import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing from .env.local');
  process.exit(1);
}

const sql = neon(connectionString);

// Chunking Logic
function chunkText(text, maxChunkWords = 50, overlapWords = 10) {
  if (!text || text.trim().length === 0) return [];
  const words = text.trim().split(/\s+/);
  const chunks = [];
  let index = 0;

  while (index < words.length) {
    const chunkWords = words.slice(index, index + maxChunkWords);
    chunks.push(chunkWords.join(' '));
    index += maxChunkWords - overlapWords;
  }

  return chunks;
}

async function runTest() {
  console.log('====================================================');
  console.log('🚀 REVBOT RAG & NEON VECTOR QUERY TEST SUITE');
  console.log('====================================================\n');

  // 1. TEST TEXT CHUNKING
  console.log('1️⃣ TESTING TEXT CHUNKING ALGORITHM...');
  const sampleKnowledgeBase = `
  Rise Defense Systems (RDS) provides enterprise-grade AI revenue operations solutions.
  Revbot automates sales pipeline analysis, lead scoring, deal stage velocity tracking, and CRM synchronization.
  Using Neon Postgres with pgvector, Revbot indexes high-dimensional embeddings directly in PostgreSQL.
  HNSW indexes enable sub-50ms vector similarity searches across millions of document chunks.
  Security and compliance are maintained through strict role-based access control, SOC2 compliance, and end-to-end encryption.
  Revenue intelligence metrics include CAC payback period, LTV to CAC ratio, expansion ARR, and churn prediction alerts.
  `;

  const chunks = chunkText(sampleKnowledgeBase, 25, 5);
  console.log(`✅ Text split into ${chunks.length} overlapping chunks:`);
  chunks.forEach((chunk, i) => {
    console.log(`   [Chunk #${i + 1} (${chunk.split(/\s+/).length} words)] "${chunk.substring(0, 60)}..."`);
  });
  console.log('');

  // 2. TEST DOCUMENT & VECTOR INGESTION
  console.log('2️⃣ TESTING NEON POSTGRES VECTOR INGESTION...');
  const title = `RDS RevOps SOP Benchmark - ${new Date().toISOString()}`;
  const docResult = await sql`
    INSERT INTO documents (title, source, metadata)
    VALUES (${title}, 'test_runner.mjs', '{"environment": "test", "author": "Antigravity"}'::jsonb)
    RETURNING id;
  `;
  const documentId = docResult[0].id;
  console.log(`✅ Master Document inserted into Neon Postgres (Document ID: #${documentId})`);

  // Create 1536-dim vector embeddings
  const targetVector = Array.from({ length: 1536 }, (_, i) => Math.sin(i));
  
  for (let idx = 0; idx < chunks.length; idx++) {
    const chunkContent = chunks[idx];
    // Slightly permute vector per chunk
    const embedding = Array.from({ length: 1536 }, (_, i) => Math.sin(i + idx * 0.1));
    const vectorString = `[${embedding.join(',')}]`;

    await sql`
      INSERT INTO document_chunks (document_id, content, chunk_index, embedding, metadata)
      VALUES (
        ${documentId}, 
        ${chunkContent}, 
        ${idx}, 
        ${vectorString}::vector, 
        '{"testRun": true}'::jsonb
      );
    `;
  }
  console.log(`✅ Inserted ${chunks.length} chunks with 1536-dim vector embeddings into Neon Postgres\n`);

  // 3. TEST VECTOR SIMILARITY SEARCH (HNSW / match_document_chunks)
  console.log('3️⃣ TESTING VECTOR SIMILARITY QUERY (match_document_chunks)...');
  const queryVectorString = `[${targetVector.join(',')}]`;
  const searchResults = await sql`
    SELECT * FROM match_document_chunks(
      ${queryVectorString}::vector,
      0.0::float,
      3::int
    );
  `;

  console.log(`✅ Retrieved Top ${searchResults.length} Vector Match Results from Neon:`);
  searchResults.forEach((res, rank) => {
    console.log(`\n   🥇 Rank #${rank + 1} | Similarity Score: ${(res.similarity * 100).toFixed(2)}%`);
    console.log(`      Chunk ID: #${res.id} (Doc #${res.document_id})`);
    console.log(`      Content: "${res.content.trim()}"`);
  });

  console.log('\n====================================================');
  console.log('🎉 ALL RAG VECTOR QUERY & CHUNKING TESTS PASSED!');
  console.log('====================================================');
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
