import { neon } from '@neondatabase/serverless';

export type DbTier = 'gold' | 'silver' | 'bronze';

export interface DbTierInfo {
  tier: DbTier;
  configured: boolean;
  host: string;
  database: string;
}

/**
 * Resolves the appropriate database connection string for Gold, Silver, or Bronze Neon DB tiers.
 * Allows Airo App Builder to wire individual tiers or default to DATABASE_URL.
 */
export function getConnectionString(tier: DbTier = 'gold'): string {
  if (tier === 'bronze') {
    return process.env.NEON_DB_BRONZE_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  }
  if (tier === 'silver') {
    return process.env.NEON_DB_SILVER_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  }
  // Gold (Production Vector DB)
  return process.env.NEON_DB_GOLD_URL || process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
}

/**
 * Retrieves a Neon serverless SQL client for the specified medallion tier.
 */
export function getDb(tier: DbTier = 'gold') {
  const connectionString = getConnectionString(tier);
  if (!connectionString) {
    throw new Error(`Database connection string for tier "${tier}" is not defined.`);
  }
  return neon(connectionString);
}

/**
 * Returns metadata about the configured Neon DB tier connection for diagnostics.
 */
export function getDbTierInfo(tier: DbTier = 'gold'): DbTierInfo {
  const urlStr = getConnectionString(tier);
  if (!urlStr) {
    return { tier, configured: false, host: 'unconfigured', database: 'unknown' };
  }
  try {
    const parsed = new URL(urlStr);
    return {
      tier,
      configured: true,
      host: parsed.hostname,
      database: parsed.pathname.replace(/^\//, '') || 'neondb',
    };
  } catch {
    return { tier, configured: true, host: 'custom-pooler', database: 'neondb' };
  }
}

