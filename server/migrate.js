// server/migrate.js
// Minimal forward-only migration runner. Applies every server/migrations/*.sql
// file in filename order exactly once, tracked in a schema_migrations table.
//
// Run: npm run db:migrate   (requires DATABASE_URL)

import { readdirSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';
import { pool, dbEnabled } from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '..', '.env.local') });

async function migrate() {
  if (!dbEnabled) {
    console.error('✖  DATABASE_URL is not set. Nothing to migrate.');
    process.exit(1);
  }

  await pool.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())'
  );
  const { rows } = await pool.query('SELECT name FROM schema_migrations');
  const applied = new Set(rows.map(r => r.name));

  const dir = resolve(__dirname, 'migrations');
  const files = readdirSync(dir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(resolve(dir, file), 'utf8');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`✓ applied ${file}`);
      count++;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✖ failed ${file}: ${err.message}`);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log(count ? `Done — ${count} migration(s) applied.` : 'Up to date — nothing to apply.');
  await pool.end();
}

migrate();
