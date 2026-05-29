import { parseJsonColumn } from '../../infrastructure/db.js';

export function mapPlace(row) {
  if (!row) return null;
  return {
    id: row.id,
    legacyId: row.legacy_id,
    name: row.name,
    groupKey: row.group_key,
    groupLabel: row.group_label,
    timeLabel: row.time_label,
    columnsCount: row.columns_count,
    blocksMealEntry: Boolean(row.blocks_meal_entry),
    active: Boolean(row.active),
    sortOrder: row.sort_order,
    metadata: parseJsonColumn(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listPlaces(db, filters = {}) {
  const where = [];
  const params = {};
  if (filters.active !== undefined) {
    where.push('active = :active');
    params.active = filters.active ? 1 : 0;
  }
  const rows = await db.query(
    `SELECT * FROM places ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY sort_order ASC, name ASC`,
    params
  );
  return rows.map(mapPlace);
}

export async function getPlace(db, id) {
  return mapPlace(await db.one('SELECT * FROM places WHERE id = :id', { id }));
}

export async function createPlace(db, data) {
  const id = await db.insert(
    `INSERT INTO places
      (legacy_id, name, group_key, group_label, time_label, columns_count, blocks_meal_entry, active, sort_order, metadata)
     VALUES
      (:legacyId, :name, :groupKey, :groupLabel, :timeLabel, :columnsCount, :blocksMealEntry, :active, :sortOrder, :metadata)`,
    data
  );
  return getPlace(db, id);
}

export async function patchPlace(db, id, data) {
  const fields = [];
  const params = { id };
  for (const [key, column] of Object.entries({
    legacyId: 'legacy_id',
    name: 'name',
    groupKey: 'group_key',
    groupLabel: 'group_label',
    timeLabel: 'time_label',
    columnsCount: 'columns_count',
    blocksMealEntry: 'blocks_meal_entry',
    active: 'active',
    sortOrder: 'sort_order'
  })) {
    if (data[key] !== undefined) {
      fields.push(`${column} = :${key}`);
      params[key] = data[key];
    }
  }
  if (data.metadata !== undefined) {
    fields.push('metadata = :metadata');
    params.metadata = JSON.stringify(data.metadata ?? {});
  }
  if (fields.length) await db.query(`UPDATE places SET ${fields.join(', ')}, updated_at = UTC_TIMESTAMP() WHERE id = :id`, params);
  return getPlace(db, id);
}
