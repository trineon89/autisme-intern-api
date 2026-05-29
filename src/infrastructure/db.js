import mysql from 'mysql2/promise';
import { ApiError } from '../utils/errors.js';

export function createDb(env) {
  const pool = mysql.createPool({
    host: env.db.host,
    port: env.db.port,
    database: env.db.database,
    user: env.db.user,
    password: env.db.password,
    waitForConnections: true,
    connectionLimit: env.db.connectionLimit,
    namedPlaceholders: true,
    decimalNumbers: true,
    dateStrings: true,
    ...(env.db.ssl ? { ssl: {} } : {})
  });

  async function query(sql, params = {}) {
    try {
      const [rows] = await pool.execute(sql, params);
      return rows;
    } catch (error) {
      throw mapDbError(error);
    }
  }

  async function one(sql, params = {}) {
    const rows = await query(sql, params);
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  async function insert(sql, params = {}) {
    const result = await query(sql, params);
    return result.insertId;
  }

  async function transaction(work) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const tx = {
        async query(sql, params = {}) {
          const [rows] = await connection.execute(sql, params);
          return rows;
        },
        async one(sql, params = {}) {
          const [rows] = await connection.execute(sql, params);
          return rows.length ? rows[0] : null;
        },
        async insert(sql, params = {}) {
          const [result] = await connection.execute(sql, params);
          return result.insertId;
        }
      };
      const result = await work(tx);
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw mapDbError(error);
    } finally {
      connection.release();
    }
  }

  return { pool, query, one, insert, transaction, end: () => pool.end() };
}

export function parseJsonColumn(value, fallback = null) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapDbError(error) {
  if (error instanceof ApiError) return error;
  if (error && error.code === 'ER_DUP_ENTRY') {
    return new ApiError(409, 'DUPLICATE_ENTRY', 'This record already exists');
  }
  if (error && error.code === 'ER_NO_REFERENCED_ROW_2') {
    return new ApiError(400, 'INVALID_REFERENCE', 'A referenced record does not exist');
  }
  const mapped = new ApiError(500, 'DATABASE_ERROR', 'Database operation failed');
  mapped.cause = error;
  return mapped;
}
