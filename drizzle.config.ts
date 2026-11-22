import { defineConfig } from 'drizzle-kit';

const host = process.env.PGHOST?.trim() || process.env.DATABASE_HOST?.trim() || '';
const port = Number(process.env.PGPORT || process.env.DATABASE_PORT || 5432);
const database = process.env.PGDATABASE?.trim() || process.env.DATABASE_NAME?.trim() || 'postgres';
const user = process.env.PGUSER?.trim() || process.env.DATABASE_USER?.trim() || '';
const password = process.env.PGPASSWORD?.trim() || process.env.DATABASE_PASSWORD?.trim() || '';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host,
    port,
    database,
    user,
    password,
    ssl: host === 'localhost' || host === '127.0.0.1' ? false : { rejectUnauthorized: false },
  },
});
