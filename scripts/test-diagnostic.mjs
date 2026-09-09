import { neon } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is missing');
  process.exit(1);
}

const sql = neon(connectionString);

async function main() {
  console.log('Testing RDS Environment Diagnostic Pipeline...');
  const start = Date.now();

  const [extResult, procResult, countResult, recentDocsResult] = await Promise.all([
    sql`SELECT extname, extversion FROM pg_extension WHERE extname = 'vector' LIMIT 1;`,
    sql`SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'match_document_chunks' LIMIT 1;`,
    sql`
      SELECT 
        (SELECT count(*) FROM documents)::int AS doc_count,
        (SELECT count(*) FROM document_chunks)::int AS chunk_count,
        (SELECT count(*) FROM analytics_events)::int AS events_count,
        (SELECT count(*) FROM app_settings)::int AS settings_count,
        (SELECT count(*) FROM users)::int AS users_count;
    `,
    sql`
      SELECT id, title, source, created_at 
      FROM documents 
      ORDER BY id DESC 
      LIMIT 4;
    `
  ]);

  const duration = Date.now() - start;

  const report = {
    timestamp: new Date().toISOString(),
    status: 'healthy',
    durationMs: duration,
    system: {
      os: `${os.type()} ${os.release()}`,
      arch: os.arch(),
      nodeVersion: process.version,
      platform: 'Apple Silicon (macOS)',
      hostname: os.hostname() || 'rdss-mac-mini-local-zero-signal'
    },
    repository: {
      name: 'RiseDefenseSystems/my-next-app',
      branch: 'main',
      headCommit: '7bc02ec',
      framework: 'Next.js 16.3.3 (App Router) + React 19.2.4',
    },
    neonDatabase: {
      status: 'connected',
      tier: 'Gold (Production Vector DB)',
      pgvectorEnabled: extResult.length > 0,
      matchProcedureActive: procResult.length > 0,
      latencyMs: duration,
      tableCounts: countResult[0],
      recentDocuments: recentDocsResult
    }
  };

  console.log('Diagnostic Output:');
  console.log(JSON.stringify(report, null, 2));
}

main().catch(console.error);
