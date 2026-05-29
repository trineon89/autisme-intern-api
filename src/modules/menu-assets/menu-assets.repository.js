import { parseJsonColumn } from '../../infrastructure/db.js';

export function mapAsset(row) {
  if (!row) return null;
  return {
    id: row.id,
    originalName: row.original_name,
    fileName: row.file_name,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    sha256: row.sha256,
    url: row.url,
    kind: row.kind,
    altText: row.alt_text,
    active: Boolean(row.active),
    metadata: parseJsonColumn(row.metadata, {}),
    createdAt: row.created_at
  };
}

export async function listAssets(db, filters = {}) {
  const where = [];
  const params = {};
  if (filters.kind) { where.push('kind = :kind'); params.kind = filters.kind; }
  if (filters.active !== undefined) { where.push('active = :active'); params.active = filters.active ? 1 : 0; }
  const rows = await db.query(
    `SELECT * FROM menu_assets ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC, id DESC`,
    params
  );
  return rows.map(mapAsset);
}

export async function insertAsset(db, data) {
  const id = await db.insert(
    `INSERT INTO menu_assets (original_name, file_name, mime_type, size_bytes, sha256, url, kind, alt_text, metadata)
     VALUES (:originalName, :fileName, :mimeType, :sizeBytes, :sha256, :url, :kind, :altText, :metadata)`,
    data
  );
  return mapAsset(await db.one('SELECT * FROM menu_assets WHERE id = :id', { id }));
}
