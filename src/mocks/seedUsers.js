// src/mocks/seedUsers.js
// Demo accounts for mock/localStorage mode. Dev builds only — production
// bundles ship zero seeded users (real accounts come from the backend, or
// self-signup while running on mock data).
//
// Both accounts use the password: Demo123!
// Hashes are salted SHA-256 (sha256(salt + ':' + password)) — see
// src/lib/localAuth.js. Never add a real person or a reused password here.

export const DEMO_SEED_USERS = import.meta.env.DEV
  ? [
      {
        id: 'u1',
        name: 'Demo Admin',
        email: 'demo.admin@example.com',
        passwordSalt: 'demo-seed-admin',
        passwordHash: '7dd344ffa2c9acd92b007af8be210b264382b19411f3dd1e3aca96450376c702',
        role: 'superadmin',
        roleId: 'role_superadmin',
        department: 'IT & Technology',
        active: true,
        lastLoginAt: null,
        forceReOtp: false,
        createdAt: '2024-09-01',
      },
      {
        id: 'u2',
        name: 'Demo User',
        email: 'demo.user@example.com',
        passwordSalt: 'demo-seed-user',
        passwordHash: 'a30ea2c34ea6382c72d061626bc21bee50e1f657823b9f88de76484c365dde10',
        role: 'user',
        roleId: 'role_user',
        department: 'IT & Technology',
        active: true,
        lastLoginAt: null,
        forceReOtp: false,
        createdAt: '2024-11-12',
      },
    ]
  : [];
