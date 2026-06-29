// server/db.js
// Postgres connection pool for the TechOps backend.
//
// Lazy by design: the pool is only created when DATABASE_URL is set. This lets
// the existing BFF (Jira/Anthropic proxy) keep booting in environments without
// a database, while the new DB-backed routes activate once DATABASE_URL exists.
//
// Usage:
//   import { query, getClient, dbEnabled, dbHealth } from './db.js';
//   const { rows } = await query('SELECT 1');

import pg from 'pg';

export const dbEnabled = Boolean(process.env.DATABASE_URL);

// Managed Postgres providers (Render, Neon, Supabase, RDS) require TLS. Allow
// self-signed chains in those managed environments unless explicitly disabled.
const ssl =
  process.env.DATABASE_SSL === 'disable'
    ? false
    : process.env.DATABASE_URL && !/localhost|127\.0\.0\.1/.test(process.env.DATABASE_URL)
      ? { rejectUnauthorized: false }
      : false;

export const pool = dbEnabled
  ? new pg.Pool({ connectionString: process.env.DATABASE_URL, ssl, max: 10 })
  : null;

if (pool) {
  // A pool error (e.g. dropped connection) must not crash the process.
  pool.on('error', err => {
    console.error(JSON.stringify({ level: 'error', msg: 'pg pool error', error: err.message }));
  });
}

export function query(text, params) {
  if (!pool) throw new Error('Database not configured (DATABASE_URL is unset).');
  return pool.query(text, params);
}

// Run a function inside a transaction, auto-rollback on throw.
export async function withTransaction(fn) {
  if (!pool) throw new Error('Database not configured (DATABASE_URL is unset).');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// Health probe used by /api/health. Never throws.
export async function dbHealth() {
  if (!pool) return 'disabled';
  try {
    await pool.query('SELECT 1');
    return 'up';
  } catch {
    return 'down';
  }
}
