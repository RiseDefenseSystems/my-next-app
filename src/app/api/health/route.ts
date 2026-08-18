import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public'`;
    return NextResponse.json({
      status: 'ok',
      database: 'connected',
      tables: tables.map((t: Record<string, unknown>) => t.table_name),
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
