// server/seed.js
// Seeds the four system roles (imported directly from src/rbac.js so the
// server and client share one source of truth) and, optionally, the first
// superadmin user. Idempotent: re-running updates roles in place.
//
// Run: npm run db:seed   (requires DATABASE_URL)
//
// To create the first superadmin, also set:
//   SEED_SUPERADMIN_EMAIL=you@example.com
//   SEED_SUPERADMIN_PASSWORD=<a-strong-password>
//   SEED_SUPERADMIN_NAME="Your Name"   (optional)

import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config as dotenvConfig } from 'dotenv';
import bcrypt from 'bcryptjs';
import { pool, dbEnabled } from './db.js';
import { SEED_ROLES } from '../src/rbac.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenvConfig({ path: resolve(__dirname, '..', '.env.local') });

async function seed() {
  if (!dbEnabled) {
    console.error('✖  DATABASE_URL is not set. Nothing to seed.');
    process.exit(1);
  }

  // Upsert the system roles.
  for (const r of SEED_ROLES) {
    await pool.query(
      `INSERT INTO roles (id, name, label, description, color, is_system, is_default, capabilities)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name, label = EXCLUDED.label, description = EXCLUDED.description,
         color = EXCLUDED.color, is_system = EXCLUDED.is_system, is_default = EXCLUDED.is_default,
         capabilities = EXCLUDED.capabilities`,
      [
        r.id,
        r.name,
        r.label,
        r.description,
        r.color,
        r.isSystem,
        r.isDefault,
        JSON.stringify(r.capabilities),
      ]
    );
  }
  console.log(`✓ seeded ${SEED_ROLES.length} system roles`);

  // Optionally create the first superadmin.
  const email = process.env.SEED_SUPERADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SEED_SUPERADMIN_PASSWORD;
  if (email && password) {
    const name = process.env.SEED_SUPERADMIN_NAME?.trim() || 'Super Admin';
    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (name, email, password_hash, role_id, active, email_verified)
       VALUES ($1,$2,$3,'role_superadmin',TRUE,TRUE)
       ON CONFLICT (email) DO UPDATE SET
         password_hash = EXCLUDED.password_hash, role_id = 'role_superadmin',
         active = TRUE, email_verified = TRUE`,
      [name, email, hash]
    );
    console.log(`✓ superadmin ready: ${email}`);
  } else {
    console.log('• no SEED_SUPERADMIN_EMAIL/PASSWORD set — skipped creating a superadmin');
  }

  await pool.end();
  console.log('Done.');
}

seed();
