import { getPool, checkDatabaseConnection, getLastDatabaseStatus } from './client';
import { PostgresStore, postgresStore } from './postgresStore';
import { store as localStore } from '../dataStore';

export interface DatabaseStatusReport {
  configured: boolean;
  status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR';
  provider: 'PostgreSQL' | 'Local JSON (Dev Fallback)';
  authoritative: 'PostgreSQL' | 'Local JSON';
  error?: string;
  checkedAt: string;
}

export function isPostgresConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== '');
}

export async function getDatabaseStatus(): Promise<DatabaseStatusReport> {
  const isConfigured = isPostgresConfigured();
  if (!isConfigured) {
    const isProduction = process.env.NODE_ENV === 'production';
    return {
      configured: false,
      status: 'NOT CONFIGURED',
      provider: 'Local JSON (Dev Fallback)',
      authoritative: isProduction ? 'PostgreSQL' : 'Local JSON',
      error: isProduction ? 'CRITICAL: DATABASE_URL is required in production environment' : undefined,
      checkedAt: new Date().toISOString()
    };
  }

  const check = await checkDatabaseConnection();
  return {
    configured: true,
    status: check.status,
    provider: 'PostgreSQL',
    authoritative: 'PostgreSQL',
    error: check.error,
    checkedAt: check.checkedAt
  };
}

/**
 * Active authoritative store selector.
 */
export function getActiveStore() {
  if (isPostgresConfigured()) {
    return postgresStore;
  }
  return localStore;
}

export { postgresStore, PostgresStore } from './postgresStore';
export { getPool, checkDatabaseConnection, withTransaction, query, getLastDatabaseStatus } from './client';
export { runMigrations } from './migrate';
export { importJsonToPostgres } from './importJsonData';
