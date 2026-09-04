import 'dotenv/config';
import pg, { Pool, PoolClient } from 'pg';

let pool: Pool | null = null;
let connectionChecked = false;
let lastConnectionStatus: {
  status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR';
  error?: string;
  checkedAt: string;
} = {
  status: 'NOT CONFIGURED',
  checkedAt: new Date().toISOString()
};

/**
 * Lazily initialize and return the PostgreSQL Connection Pool.
 */
export function getPool(): Pool | null {
  if (pool) return pool;

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl || dbUrl.trim() === '') {
    return null;
  }

  try {
    const isProduction = process.env.NODE_ENV === 'production';
    const requiresSSL = 
      process.env.DATABASE_SSL === 'true' || 
      dbUrl.includes('sslmode=require') || 
      (isProduction && !dbUrl.includes('localhost') && !dbUrl.includes('127.0.0.1'));

    pool = new pg.Pool({
      connectionString: dbUrl,
      max: parseInt(process.env.DB_POOL_MAX || '20', 10),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ssl: requiresSSL ? { rejectUnauthorized: false } : undefined
    });

    pool.on('error', (err) => {
      console.error('[POSTGRES POOL ERROR]:', err.message);
    });

    return pool;
  } catch (err: any) {
    console.error('[POSTGRES INIT ERROR]:', err.message);
    return null;
  }
}

/**
 * Check if the database connection is currently active and healthy.
 */
export async function checkDatabaseConnection(): Promise<{
  status: 'CONNECTED' | 'NOT CONFIGURED' | 'ERROR';
  error?: string;
  checkedAt: string;
}> {
  const currentPool = getPool();
  if (!currentPool) {
    lastConnectionStatus = {
      status: 'NOT CONFIGURED',
      checkedAt: new Date().toISOString()
    };
    return lastConnectionStatus;
  }

  try {
    const client = await currentPool.connect();
    try {
      await client.query('SELECT 1 AS health_check');
      lastConnectionStatus = {
        status: 'CONNECTED',
        checkedAt: new Date().toISOString()
      };
      return lastConnectionStatus;
    } finally {
      client.release();
    }
  } catch (err: any) {
    lastConnectionStatus = {
      status: 'ERROR',
      error: 'Database connection failed: ' + (err.message || 'Unknown error'),
      checkedAt: new Date().toISOString()
    };
    return lastConnectionStatus;
  }
}

export function getLastDatabaseStatus() {
  return lastConnectionStatus;
}

/**
 * Execute a unit of work inside an isolated database transaction with automatic COMMIT and ROLLBACK.
 */
export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('Database is not configured (DATABASE_URL missing).');
  }

  const client = await currentPool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackErr) {
      console.error('[POSTGRES ROLLBACK ERROR]:', rollbackErr);
    }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Helper to execute a single query using the pool.
 */
export async function query<T = any>(sql: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const currentPool = getPool();
  if (!currentPool) {
    throw new Error('Database is not configured (DATABASE_URL missing).');
  }
  return currentPool.query<T>(sql, params);
}
