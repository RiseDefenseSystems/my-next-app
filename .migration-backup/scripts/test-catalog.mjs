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

async function testCatalog() {
  console.log('Testing document catalog query in Neon Postgres...');
  const results = await sql`
    SELECT 
      d.id, 
      d.title, 
      d.source, 
      d.metadata, 
      COUNT(c.id)::int AS chunk_count
    FROM documents d
    LEFT JOIN document_chunks c ON d.id = c.document_id
    GROUP BY d.id, d.title, d.source, d.metadata
    ORDER BY d.id DESC
    LIMIT 10;
  `;

  console.log(`Found ${results.length} documents in Neon catalog:`);
  results.forEach((doc) => {
    console.log(`- Doc #${doc.id}: "${doc.title}" | Chunks: ${doc.chunk_count} | Source: ${doc.source || 'N/A'}`);
  });
}

testCatalog().catch((err) => {
  console.error(err);
  process.exit(1);
});
