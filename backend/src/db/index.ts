import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';

const { Pool } = pg;

type Database = NodePgDatabase<typeof schema>;

let pool: pg.Pool | undefined;
let dbInstance: Database | undefined;

// Mock database for development when DATABASE_URL is not set
function createMockDb() {
  // This is a placeholder that allows the server to start
  // In production, always set DATABASE_URL
  throw new Error(
    'DATABASE_URL must be set for production. ' +
    'For development mock mode, use a different approach.'
  );
}

export function getDb(): Database {
  if (!process.env.DATABASE_URL) {
    // In development without a database, use mock mode
    if (process.env.NODE_ENV === 'test' || process.env.USE_MOCK_DB === 'true') {
      return createMockDb() as any;
    }
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
