import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());

function parseEnvFile(content) {
  const values = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index === -1) continue;
    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function loadDotEnv() {
  const envPath = path.join(ROOT, '.env');
  if (!fs.existsSync(envPath)) return {};
  const parsed = parseEnvFile(fs.readFileSync(envPath, 'utf8'));
  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined) process.env[key] = value;
  }
  return parsed;
}

function bool(name, fallback = false) {
  const value = process.env[name];
  if (value === undefined || value === '') return fallback;
  return ['1', 'true', 'yes', 'on', 'jo', 'oui'].includes(String(value).toLowerCase());
}

function number(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) ? value : fallback;
}

function list(name, fallback = []) {
  const value = process.env[name];
  if (!value) return fallback;
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function resolveListenHost(appEnv) {
  // Use LISTEN_HOST for runtime binding. HOST is kept only for local/backward compatibility.
  // In production, default to 0.0.0.0 so managed reverse proxies/container routers can reach the app.
  if (process.env.LISTEN_HOST) return process.env.LISTEN_HOST;
  if (appEnv !== 'production' && process.env.HOST) return process.env.HOST;
  return appEnv === 'production' ? '0.0.0.0' : '127.0.0.1';
}

export function loadEnv() {
  loadDotEnv();
  const appEnv = process.env.APP_ENV || 'production';
  return Object.freeze({
    appEnv,
    isProduction: appEnv === 'production',
    host: resolveListenHost(appEnv),
    port: number('PORT', number('LISTEN_PORT', 3000)),
    apiPublicUrl: process.env.API_PUBLIC_URL || 'https://api2.autisme.lu',
    corsOrigins: list('CORS_ORIGINS', ['https://namnam.autisme.lu']),
    db: {
      host: process.env.DB_HOST || '',
      port: number('DB_PORT', 3306),
      database: process.env.DB_NAME || '',
      user: process.env.DB_USER || '',
      password: process.env.DB_PASSWORD || '',
      connectionLimit: number('DB_CONNECTION_LIMIT', 10),
      ssl: bool('DB_SSL', false)
    },
    authRequired: bool('AUTH_REQUIRED', true),
    sessionTtlHours: number('SESSION_TTL_HOURS', 12),
    passwordPepper: process.env.PASSWORD_PEPPER || '',
    internalApiToken: process.env.INTERNAL_API_TOKEN || '',
    legacyApiKey: process.env.LEGACY_API_KEY || '',
    logLevel: process.env.LOG_LEVEL || 'info',
    maxUploadBytes: number('MAX_UPLOAD_BYTES', 10 * 1024 * 1024),
    uploadDir: process.env.UPLOAD_DIR || 'storage/uploads',
    reportDir: process.env.REPORT_DIR || 'storage/reports',
    importDir: process.env.IMPORT_DIR || 'storage/imports'
  });
}

export function validateEnv(env) {
  const missing = [];
  for (const [name, value] of [
    ['DB_HOST', env.db.host],
    ['DB_NAME', env.db.database],
    ['DB_USER', env.db.user],
    ['DB_PASSWORD', env.db.password]
  ]) {
    if (!value) missing.push(name);
  }
  if (env.authRequired) {
    if (!env.passwordPepper || env.passwordPepper.startsWith('change-me')) missing.push('PASSWORD_PEPPER');
  }
  return missing;
}

export { parseEnvFile, resolveListenHost };
