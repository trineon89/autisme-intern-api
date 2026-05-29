import mysql from 'mysql2/promise';
import { loadEnv, validateEnv } from '../src/config/env.js';
import { hashPassword } from '../src/infrastructure/password.js';

const env = loadEnv();
const missing = validateEnv(env).filter((name) => name.startsWith('DB_'));
if (missing.length) {
  console.error(`Missing database configuration: ${missing.join(', ')}`);
  process.exit(1);
}

const email = process.env.ADMIN_EMAIL;
const password = process.env.ADMIN_PASSWORD;
const displayName = process.env.ADMIN_NAME || 'NamNam Admin';
const role = process.env.ADMIN_ROLE || 'admin';

if (!email || !password) {
  console.error('Usage: ADMIN_EMAIL=you@example.lu ADMIN_PASSWORD=secret ADMIN_NAME="Your Name" node scripts/create-admin.js');
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  ...(env.db.ssl ? { ssl: {} } : {})
});

const passwordHash = await hashPassword(password, env.passwordPepper);
await connection.execute(
  `INSERT INTO users (email, password_hash, display_name, role, active)
   VALUES (?, ?, ?, ?, 1)
   ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), display_name = VALUES(display_name), role = VALUES(role), active = 1`,
  [email.toLowerCase(), passwordHash, displayName, role]
);
await connection.end();
console.log(`Admin user ready: ${email}`);
