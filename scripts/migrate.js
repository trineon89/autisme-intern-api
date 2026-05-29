import fs from 'node:fs/promises';
import path from 'node:path';
import mysql from 'mysql2/promise';
import { loadEnv, validateEnv } from '../src/config/env.js';

const env = loadEnv();
const missing = validateEnv(env).filter((name) => name.startsWith('DB_'));
if (missing.length) {
  console.error(`Missing database configuration: ${missing.join(', ')}`);
  process.exit(1);
}

const connection = await mysql.createConnection({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  multipleStatements: false,
  ...(env.db.ssl ? { ssl: {} } : {})
});

function splitSql(sql) {
  const statements = [];
  let statement = '';
  let quote = null;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    const prev = sql[i - 1];
    if ((char === "'" || char === '"' || char === '`') && prev !== '\\') quote = quote === char ? null : quote || char;
    if (char === ';' && !quote) {
      const trimmed = statement.trim();
      if (trimmed) statements.push(trimmed);
      statement = '';
    } else {
      statement += char;
    }
  }
  const tail = statement.trim();
  if (tail) statements.push(tail);
  return statements;
}

const dir = path.resolve('migrations');
const files = (await fs.readdir(dir)).filter((file) => file.endsWith('.sql')).sort();

try {
  for (const file of files) {
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    const statements = splitSql(sql.replace(/^--.*$/gm, ''));
    console.log(`Applying ${file} (${statements.length} statements)`);
    for (const statement of statements) await connection.execute(statement);
  }
  console.log('Migrations completed.');
} finally {
  await connection.end();
}
