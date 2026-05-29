import { parseJsonColumn } from '../../infrastructure/db.js';

export function mapPerson(row) {
  if (!row) return null;
  return {
    id: row.id,
    legacyId: row.legacy_id,
    lastName: row.last_name,
    firstName: row.first_name,
    displayName: row.display_name || `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    birthDate: row.birth_date,
    photoUrl: row.photo_url,
    isEncadrant: Boolean(row.is_encadrant),
    hasBasePlan: Boolean(row.has_base_plan),
    mealRegistrationEnabled: Boolean(row.meal_registration_enabled),
    billingCategory: row.billing_category,
    defaultPlaceId: row.default_place_id,
    active: Boolean(row.active),
    sortOrder: row.sort_order,
    notes: row.notes,
    metadata: parseJsonColumn(row.metadata, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listPeople(db, filters = {}) {
  const where = [];
  const params = {};
  if (filters.active !== undefined) {
    where.push('p.active = :active');
    params.active = filters.active ? 1 : 0;
  }
  if (filters.mealRegistrationEnabled !== undefined) {
    where.push('p.meal_registration_enabled = :mealRegistrationEnabled');
    params.mealRegistrationEnabled = filters.mealRegistrationEnabled ? 1 : 0;
  }
  if (filters.isEncadrant !== undefined) {
    where.push('p.is_encadrant = :isEncadrant');
    params.isEncadrant = filters.isEncadrant ? 1 : 0;
  }
  if (filters.q) {
    where.push('(LOWER(p.last_name) LIKE LOWER(:q) OR LOWER(p.first_name) LIKE LOWER(:q) OR LOWER(p.display_name) LIKE LOWER(:q))');
    params.q = `%${filters.q}%`;
  }
  if (filters.billingCategory) {
    where.push('p.billing_category = :billingCategory');
    params.billingCategory = filters.billingCategory;
  }
  const rows = await db.query(
    `SELECT p.* FROM people p
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY p.sort_order ASC, p.is_encadrant DESC, p.last_name ASC, p.first_name ASC`,
    params
  );
  return rows.map(mapPerson);
}

export async function getPerson(db, id) {
  return mapPerson(await db.one('SELECT * FROM people WHERE id = :id', { id }));
}

export async function createPerson(db, data) {
  const id = await db.insert(
    `INSERT INTO people
      (legacy_id, last_name, first_name, display_name, birth_date, photo_url, is_encadrant, has_base_plan,
       meal_registration_enabled, billing_category, default_place_id, active, sort_order, notes, metadata)
     VALUES
      (:legacyId, :lastName, :firstName, :displayName, :birthDate, :photoUrl, :isEncadrant, :hasBasePlan,
       :mealRegistrationEnabled, :billingCategory, :defaultPlaceId, :active, :sortOrder, :notes, :metadata)`,
    data
  );
  return getPerson(db, id);
}

export async function patchPerson(db, id, data) {
  const fields = [];
  const params = { id };
  for (const [apiKey, column] of Object.entries({
    legacyId: 'legacy_id',
    lastName: 'last_name',
    firstName: 'first_name',
    displayName: 'display_name',
    birthDate: 'birth_date',
    photoUrl: 'photo_url',
    isEncadrant: 'is_encadrant',
    hasBasePlan: 'has_base_plan',
    mealRegistrationEnabled: 'meal_registration_enabled',
    billingCategory: 'billing_category',
    defaultPlaceId: 'default_place_id',
    active: 'active',
    sortOrder: 'sort_order',
    notes: 'notes'
  })) {
    if (data[apiKey] !== undefined) {
      fields.push(`${column} = :${apiKey}`);
      params[apiKey] = data[apiKey];
    }
  }
  if (data.metadata !== undefined) {
    fields.push('metadata = :metadata');
    params.metadata = JSON.stringify(data.metadata ?? {});
  }
  if (!fields.length) return getPerson(db, id);
  await db.query(`UPDATE people SET ${fields.join(', ')}, updated_at = UTC_TIMESTAMP() WHERE id = :id`, params);
  return getPerson(db, id);
}
