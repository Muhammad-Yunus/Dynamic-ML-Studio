import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

function resolveConnectionConfig() {
  const host = process.env.PGHOST?.trim() || process.env.DATABASE_HOST?.trim();
  const user = process.env.PGUSER?.trim() || process.env.DATABASE_USER?.trim();
  const password = process.env.PGPASSWORD?.trim() || process.env.DATABASE_PASSWORD?.trim();
  const database = process.env.PGDATABASE?.trim() || process.env.DATABASE_NAME?.trim() || 'postgres';
  const port = Number(process.env.PGPORT || process.env.DATABASE_PORT || 5432);

  if (host && user && password) {
    const isLocal = host === 'localhost' || host === '127.0.0.1';
    const disableSsl = process.env.PGSSLMODE === 'disable' || isLocal;
    return {
      host,
      port,
      database,
      user,
      password,
      ssl: disableSsl ? false : { rejectUnauthorized: false },
    };
  }
  return null;
}

let pool: Pool | null = null;
let dbInstance: NodePgDatabase<typeof schema> | null = null;
let dbAvailable = false;

export async function initDatabase(): Promise<{ available: boolean; reason?: string }> {
  const config = resolveConnectionConfig();
  if (!config) {
    console.warn(
      '[DB] PostgreSQL env vars (PGHOST, PGPORT, PGDATABASE, PGUSER, PGPASSWORD) are not set. Running with local in-memory runtime store.'
    );
    return { available: false, reason: 'PostgreSQL discrete environment variables not configured' };
  }

  try {
    pool = new Pool({
      ...config,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });

    await pool.query('SELECT 1');

    // Ensure schema exists idempotently
    await pool.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";
      CREATE TABLE IF NOT EXISTS users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email text NOT NULL UNIQUE,
        display_name text NOT NULL,
        password_hash text NOT NULL,
        role text NOT NULL DEFAULT 'user',
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS experiments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text,
        status text NOT NULL DEFAULT 'In draft',
        graph_json jsonb NOT NULL,
        is_sample boolean NOT NULL DEFAULT false,
        updated_at timestamp NOT NULL DEFAULT now(),
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS datasets (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        name text NOT NULL,
        description text,
        format text NOT NULL DEFAULT 'csv',
        row_count integer NOT NULL DEFAULT 0,
        column_count integer NOT NULL DEFAULT 0,
        columns_json jsonb NOT NULL,
        rustfs_key text NOT NULL,
        size_bytes integer NOT NULL DEFAULT 0,
        is_sample boolean NOT NULL DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS trained_models (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        experiment_id uuid REFERENCES experiments(id) ON DELETE SET NULL,
        name text NOT NULL,
        algorithm text NOT NULL,
        task_type text NOT NULL,
        metrics_json jsonb NOT NULL,
        hyperparams_json jsonb NOT NULL,
        feature_columns_json jsonb NOT NULL,
        target_column text,
        rustfs_key text NOT NULL,
        created_at timestamp NOT NULL DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS experiment_runs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        experiment_id uuid REFERENCES experiments(id) ON DELETE CASCADE,
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        status text NOT NULL,
        started_at timestamp NOT NULL DEFAULT now(),
        finished_at timestamp,
        duration_ms integer NOT NULL DEFAULT 0,
        node_results_json jsonb NOT NULL,
        logs_json jsonb NOT NULL
      );
      CREATE TABLE IF NOT EXISTS web_services (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid REFERENCES users(id) ON DELETE CASCADE,
        model_id uuid NOT NULL REFERENCES trained_models(id) ON DELETE CASCADE,
        name text NOT NULL,
        endpoint_slug text NOT NULL UNIQUE,
        input_schema_json jsonb NOT NULL,
        is_active boolean NOT NULL DEFAULT true,
        call_count integer NOT NULL DEFAULT 0,
        created_at timestamp NOT NULL DEFAULT now()
      );
    `);

    dbInstance = drizzle(pool, { schema });
    dbAvailable = true;
    console.log('[DB] Connected to PostgreSQL with Drizzle ORM.');
    return { available: true };
  } catch (err: any) {
    console.warn('[DB] PostgreSQL connection failed, falling back to in-memory runtime store:', err?.message || err);
    pool = null;
    dbInstance = null;
    dbAvailable = false;
    return { available: false, reason: err?.message || 'Connection failed' };
  }
}

export function getDb() {
  return dbInstance;
}

export function isDbConnected() {
  return dbAvailable && dbInstance !== null;
}
