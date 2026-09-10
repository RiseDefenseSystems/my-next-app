import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing from .env.local');
  process.exit(1);
}

const sql = neon(connectionString);

async function simulateLangGraphEndpoint() {
  console.log('====================================================');
  console.log('🚀 TESTING /api/langgraph ENDPOINT LOGIC');
  console.log('====================================================\n');

  const prompt = "What is our revenue optimization workflow?";
  console.log(`Prompt: "${prompt}"`);

  // 1. Vector similarity search in Neon Postgres
  console.log('\n1️⃣ Querying Neon Postgres pgvector for RAG Context...');
  const mockVector = Array.from({ length: 1536 }, (_, i) => Math.sin(i));
  const queryVectorString = `[${mockVector.join(',')}]`;

  const results = await sql`
    SELECT * FROM match_document_chunks(
      ${queryVectorString}::vector,
      0.0::float,
      3::int
    );
  `;

  const ragMatches = results.map((row) => ({
    id: row.id,
    document_id: row.document_id,
    content: row.content,
    metadata: row.metadata,
    similarity: Number(row.similarity),
  }));

  console.log(`✅ Retrieved ${ragMatches.length} matching document chunks from Neon Postgres.`);

  const mockThreadId = `thread_test_${Date.now().toString(36)}`;
  const mockRunId = `run_${Date.now().toString(36)}`;

  const outputData = {
    success: true,
    threadId: mockThreadId,
    runId: mockRunId,
    status: 'completed',
    ragMatches,
    output: {
      id: mockRunId,
      thread_id: mockThreadId,
      agent: 'agent',
      status: 'success',
      response: `Based on your indexed RevOps documentation in Neon Postgres: "${ragMatches[0]?.content || 'N/A'}"`
    }
  };

  console.log('\n2️⃣ Simulated /api/langgraph JSON Output:');
  console.log('----------------------------------------------------');
  console.log('LangGraph Thread ID:', outputData.threadId);
  console.log('Neon RAG Matches Count:', outputData.ragMatches.length);
  console.log('Top Match Similarity:', `${(outputData.ragMatches[0]?.similarity * 100).toFixed(1)}%`);
  console.log('LangGraph Agent Output Status:', outputData.status);
  console.log('----------------------------------------------------\n');

  console.log(JSON.stringify(outputData, null, 2));

  console.log('\n====================================================');
  console.log('🎉 /api/langgraph TEST SIMULATION COMPLETED!');
  console.log('====================================================');
}

simulateLangGraphEndpoint().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
