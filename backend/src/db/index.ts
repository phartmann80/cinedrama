import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

type Database = NodePgDatabase<typeof schema>;

let pool: pg.Pool | undefined;
let dbInstance: Database | undefined;

export function getDb(): Database {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set. Did you forget to provision a database?');
  }
  if (!dbInstance) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    dbInstance = drizzle(pool, { schema });
  }
  return dbInstance;
}

export function getPool(): pg.Pool {
  getDb();
  if (!pool) {
    throw new Error('DATABASE_URL must be set.');
  }
  return pool;
}

export * from './schema.js';
