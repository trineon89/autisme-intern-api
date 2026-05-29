export function mapRegistration(row) {
  if (!row) return null;
  return {
    id: row.id,
    personId: row.person_id,
    date: row.date,
    placeId: row.place_id,
    mealChoiceId: row.meal_choice_id,
    comment: row.comment,
    source: row.source,
    status: row.status,
    person: row.person_id ? { id: row.person_id, lastName: row.last_name, firstName: row.first_name, isEncadrant: Boolean(row.is_encadrant) } : undefined,
    place: row.place_id ? { id: row.place_id, name: row.place_name, blocksMealEntry: Boolean(row.blocks_meal_entry) } : undefined,
    mealChoice: row.meal_choice_id ? { id: row.meal_choice_id, code: row.meal_choice_code, labelLb: row.meal_choice_label_lb } : undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const SELECT = `SELECT mr.*, p.last_name, p.first_name, p.is_encadrant, pl.name AS place_name, pl.blocks_meal_entry,
  mc.code AS meal_choice_code, mc.label_lb AS meal_choice_label_lb
  FROM meal_registrations mr
  JOIN people p ON p.id = mr.person_id
  LEFT JOIN places pl ON pl.id = mr.place_id
  LEFT JOIN meal_choices mc ON mc.id = mr.meal_choice_id`;

export async function listRegistrations(db, filters = {}) {
  const where = [];
  const params = {};
  if (filters.from) { where.push('mr.date >= :from'); params.from = filters.from; }
  if (filters.until) { where.push('mr.date <= :until'); params.until = filters.until; }
  if (filters.personId) { where.push('mr.person_id = :personId'); params.personId = filters.personId; }
  if (filters.placeId) { where.push('mr.place_id = :placeId'); params.placeId = filters.placeId; }
  if (filters.mealChoiceId) { where.push('mr.meal_choice_id = :mealChoiceId'); params.mealChoiceId = filters.mealChoiceId; }
  const rows = await db.query(`${SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY mr.date ASC, pl.sort_order ASC, p.last_name ASC`, params);
  return rows.map(mapRegistration);
}

export async function getRegistrationByPersonDate(db, personId, date) {
  return mapRegistration(await db.one(`${SELECT} WHERE mr.person_id = :personId AND mr.date = :date LIMIT 1`, { personId, date }));
}

export async function upsertRegistration(db, data) {
  await db.query(
    `INSERT INTO meal_registrations (person_id, date, place_id, meal_choice_id, comment, source, status, created_by)
     VALUES (:personId, :date, :placeId, :mealChoiceId, :comment, :source, :status, :createdBy)
     ON DUPLICATE KEY UPDATE place_id = VALUES(place_id), meal_choice_id = VALUES(meal_choice_id), comment = VALUES(comment), source = VALUES(source), status = VALUES(status), updated_at = UTC_TIMESTAMP()`,
    data
  );
  return getRegistrationByPersonDate(db, data.personId, data.date);
}

export async function upsertWeek(db, personId, entries, createdBy) {
  return db.transaction(async (tx) => {
    const result = { updated: [], skipped: [], warnings: [], errors: [] };
    for (const entry of entries) {
      await tx.query(
        `INSERT INTO meal_registrations (person_id, date, place_id, meal_choice_id, comment, source, status, created_by)
         VALUES (:personId, :date, :placeId, :mealChoiceId, :comment, :source, :status, :createdBy)
         ON DUPLICATE KEY UPDATE place_id = VALUES(place_id), meal_choice_id = VALUES(meal_choice_id), comment = VALUES(comment), source = VALUES(source), status = VALUES(status), updated_at = UTC_TIMESTAMP()`,
        { personId, createdBy, ...entry }
      );
      result.updated.push({ date: entry.date });
    }
    return result;
  });
}

export async function registrationWarnings(db, personId, date, placeId = null) {
  const warnings = [];
  const reserved = await db.one('SELECT * FROM reserved_dates WHERE date = :date', { date });
  if (reserved) warnings.push({ code: 'RESERVED_DATE', message: reserved.label || 'Reserved date', reservedDate: reserved });
  if (placeId) {
    const place = await db.one('SELECT * FROM places WHERE id = :placeId', { placeId });
    if (place?.blocks_meal_entry) warnings.push({ code: 'PLACE_BLOCKS_MEAL_ENTRY', message: 'This place blocks meal entry', placeId });
  }
  const person = await db.one('SELECT active, meal_registration_enabled FROM people WHERE id = :personId', { personId });
  if (!person?.active) warnings.push({ code: 'PERSON_INACTIVE', message: 'Person is inactive' });
  if (person && !person.meal_registration_enabled) warnings.push({ code: 'MEAL_REGISTRATION_DISABLED', message: 'Meal registration disabled for this person' });
  return warnings;
}
