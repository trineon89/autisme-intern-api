export function mapUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function findUserByEmail(db, email) {
  return await db.one('SELECT * FROM users WHERE LOWER(email) = LOWER(:email) LIMIT 1', { email });
}

export async function findUserById(db, id) {
  return mapUser(await db.one('SELECT * FROM users WHERE id = :id LIMIT 1', { id }));
}

export async function createSession(db, { userId, tokenHash, expiresAt, userAgent, ipAddress }) {
  await db.query(
    `INSERT INTO api_sessions (user_id, token_hash, expires_at, user_agent, ip_address)
     VALUES (:userId, :tokenHash, :expiresAt, :userAgent, :ipAddress)`,
    { userId, tokenHash, expiresAt, userAgent, ipAddress }
  );
}

export async function revokeSession(db, sessionId) {
  if (!sessionId) return;
  await db.query('UPDATE api_sessions SET revoked_at = UTC_TIMESTAMP() WHERE id = :sessionId', { sessionId });
}

export async function revokeToken(db, tokenHash) {
  await db.query('UPDATE api_sessions SET revoked_at = UTC_TIMESTAMP() WHERE token_hash = :tokenHash', { tokenHash });
}
