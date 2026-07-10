import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

let _db: ReturnType<typeof drizzle<typeof schema>>;

const DB_TIMEOUT_MS = Number(process.env.DB_TIMEOUT_MS) || 10_000;

function getDb() {
  if (!_db) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    const client = postgres(connectionString, {
      max: Number(process.env.DB_POOL_MAX) || 40,
      connect_timeout: 10,
      idle_timeout: 30,
    });
    _db = drizzle(client, { schema });
  }
  return _db;
}

export function withDbTimeout<T>(promise: Promise<T>, ms = DB_TIMEOUT_MS): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`DB query timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    const instance = getDb();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  },
});

export * from './schema';
