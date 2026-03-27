import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { getEnv } from '../config/env.js';
import * as schema from './schema/index.js';
import Pino from 'pino';

const { Pool } = pg;
const logger = Pino({ name: 'db-client' });

let pool: pg.Pool | null = null;
let db: any = null;

export function getDb(): any {
  if (db) {
    return db;
  }

  const env = getEnv();
  
  try {
    pool = new Pool({
      connectionString: env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      logger.warn({ err }, 'Pool error, continuing');
    });

    db = drizzle(pool, { schema });
  } catch (err) {
    logger.warn({ err }, 'Failed to connect to database');
    db = {};
  }
  
  return db;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    try {
      await pool.end();
    } catch (e) {}
    pool = null;
    db = null;
  }
}

export { schema };