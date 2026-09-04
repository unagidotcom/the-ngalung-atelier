import fs from 'fs';
import path from 'path';
import { getPool, checkDatabaseConnection } from './client';

const MIGRATIONS_DIR = path.join(process.cwd(), 'server', 'db', 'migrations');

export async function runMigrations(): Promise<{ success: boolean; applied: string[]; message: string }> {
  const pool = getPool();
  if (!pool) {
    return {
      success: false,
      applied: [],
      message: 'Cannot run migrations: DATABASE_URL is not configured.'
    };
  }

  const client = await pool.connect();
  try {
    // 1. Ensure migrations tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(255) PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already applied migrations
    const res = await client.query<{ version: string }>('SELECT version FROM schema_migrations ORDER BY version ASC');
    const appliedVersions = new Set(res.rows.map(r => r.version));

    // 3. Scan migrations directory
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      return { success: true, applied: [], message: 'No migrations directory found.' };
    }

    const files = fs.readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    const newlyApplied: string[] = [];

    for (const file of files) {
      if (appliedVersions.has(file)) {
        continue;
      }

      console.log(`[MIGRATION] Applying ${file}...`);
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sqlContent = fs.readFileSync(filePath, 'utf-8');

      // Execute migration in an isolated transaction
      await client.query('BEGIN');
      try {
        await client.query(sqlContent);
        await client.query('INSERT INTO schema_migrations (version, applied_at) VALUES ($1, NOW())', [file]);
        await client.query('COMMIT');
        newlyApplied.push(file);
        console.log(`[MIGRATION] ✓ Applied ${file} successfully.`);
      } catch (migrationErr: any) {
        await client.query('ROLLBACK');
        console.error(`[MIGRATION] ✗ Failed applying ${file}:`, migrationErr.message);
        throw new Error(`Migration ${file} failed: ${migrationErr.message}`);
      }
    }

    return {
      success: true,
      applied: newlyApplied,
      message: newlyApplied.length > 0 
        ? `Successfully applied ${newlyApplied.length} migration(s): ${newlyApplied.join(', ')}`
        : 'Database schema is already up to date.'
    };
  } finally {
    client.release();
  }
}

// CLI execution entry point
if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  (async () => {
    console.log('--- EXECUTING POSTGRESQL SCHEMA MIGRATIONS ---');
    const status = await checkDatabaseConnection();
    if (status.status !== 'CONNECTED') {
      console.error('Database connection check failed:', status.error || 'DATABASE_URL not configured');
      process.exit(1);
    }
    const result = await runMigrations();
    console.log(result.message);
    process.exit(result.success ? 0 : 1);
  })().catch(err => {
    console.error('Fatal migration error:', err);
    process.exit(1);
  });
}
