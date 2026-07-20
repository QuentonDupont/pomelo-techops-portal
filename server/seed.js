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

  // Starter service-catalog request types (idempotent by slug). Only inserted
  // when missing so admin edits in the portal are never overwritten.
  const STARTER_REQUEST_TYPES = [
    {
      slug: 'hardware-request',
      name: 'Hardware request',
      description: 'Request a laptop, monitor, keyboard, or other physical equipment.',
      icon: 'Laptop',
      category: 'Hardware',
      sort: 10,
      fields: [
        {
          id: 'item',
          label: 'What do you need?',
          type: 'select',
          options: ['Laptop', 'Monitor', 'Keyboard / Mouse', 'Headset', 'Docking station', 'Other'],
          required: true,
        },
        { id: 'justification', label: 'Business justification', type: 'textarea', required: true },
        { id: 'needed_by', label: 'Needed by', type: 'date', required: false },
      ],
      defaults: { priority: 'Medium', issueType: 'Support Request', category: 'Hardware' },
    },
    {
      slug: 'access-request',
      name: 'Access request',
      description: 'Request access to an application, shared drive, or system.',
      icon: 'KeyRound',
      category: 'Access',
      sort: 20,
      fields: [
        { id: 'system', label: 'System or application', type: 'text', required: true },
        {
          id: 'access_level',
          label: 'Access level',
          type: 'select',
          options: ['Read-only', 'Read/write', 'Admin'],
          required: true,
        },
        { id: 'manager_aware', label: 'My manager is aware of this request', type: 'checkbox' },
        { id: 'reason', label: 'Why do you need access?', type: 'textarea', required: true },
      ],
      defaults: { priority: 'Medium', issueType: 'Support Request', category: 'Access' },
    },
    {
      slug: 'software-install',
      name: 'Software installation',
      description: 'Get software installed or licensed on your machine.',
      icon: 'PackagePlus',
      category: 'Software',
      sort: 30,
      fields: [
        { id: 'software', label: 'Software name', type: 'text', required: true },
        { id: 'version', label: 'Version (if known)', type: 'text' },
        { id: 'reason', label: 'What will you use it for?', type: 'textarea', required: true },
      ],
      defaults: { priority: 'Low', issueType: 'Support Request', category: 'Software' },
    },
    {
      slug: 'report-an-issue',
      name: 'Report an issue',
      description: 'Something is broken or not behaving as expected.',
      icon: 'Bug',
      category: 'Support',
      sort: 40,
      fields: [
        {
          id: 'where',
          label: 'Where did it happen? (app, page, device)',
          type: 'text',
          required: true,
        },
        { id: 'steps', label: 'Steps to reproduce', type: 'textarea' },
        { id: 'impact', label: 'Is this blocking your work?', type: 'checkbox' },
      ],
      defaults: { priority: 'High', issueType: 'Bug', category: 'Support' },
    },
    {
      slug: 'general-question',
      name: 'General question',
      description: 'Ask the TechOps team anything not covered by the other items.',
      icon: 'MessageCircleQuestion',
      category: 'General',
      sort: 50,
      fields: [{ id: 'question', label: 'Your question', type: 'textarea', required: true }],
      defaults: { priority: 'Low', issueType: 'Support Request', category: 'General' },
    },
  ];
  let insertedTypes = 0;
  for (const t of STARTER_REQUEST_TYPES) {
    const { rowCount } = await pool.query(
      `INSERT INTO request_types (slug, name, description, icon, category, fields, defaults, sort)
       VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8)
       ON CONFLICT (slug) DO NOTHING`,
      [
        t.slug,
        t.name,
        t.description,
        t.icon,
        t.category,
        JSON.stringify(t.fields),
        JSON.stringify(t.defaults),
        t.sort,
      ]
    );
    insertedTypes += rowCount;
  }
  console.log(`✓ service catalog: ${insertedTypes} starter request type(s) inserted`);

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
