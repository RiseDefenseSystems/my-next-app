import { NextResponse } from 'next/server';
import { getDb, getDbTierInfo, type DbTier } from '@/lib/db';

export async function GET() {
  try {
    const tiers: DbTier[] = ['gold', 'silver', 'bronze'];
    const tierDiagnostics: Record<string, unknown> = {};

    for (const tier of tiers) {
      const info = getDbTierInfo(tier);
      try {
        const sql = getDb(tier);
        const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
        tierDiagnostics[tier] = {
          status: 'connected',
          host: info.host,
          database: info.database,
          tableCount: tables.length,
          tables: tables.map((t: Record<string, unknown>) => t.table_name),
        };
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        tierDiagnostics[tier] = {
          status: 'error',
          host: info.host,
          error: msg,
        };
      }
    }

    return NextResponse.json({
      status: 'ok',
      platform: 'Rise Defense Systems (RDS) Revbot Engine',
      airoBuilderOrigin: 'https://rdsrevops.com',
      neonTiers: tierDiagnostics,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { status: 'error', message },
      { status: 500 }
    );
  }
}

