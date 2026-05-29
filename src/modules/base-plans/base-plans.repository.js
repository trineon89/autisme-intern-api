export function mapBasePlan(row) {
  if (!row) return null;
  return {
    id: row.id,
    personId: row.person_id,
    weekday: row.weekday,
    placeId: row.place_id,
    mealChoiceId: row.meal_choice_id,
    comment: row.comment,
    active: Boolean(row.active),
    person: row.person_id ? {
      id: row.person_id,
      lastName: row.last_name,
      firstName: row.first_name,
      isEncadrant: Boolean(row.is_encadrant)
    } : undefined,
    place: row.place_id ? { id: row.place_id, name: row.place_name } : undefined,
    mealChoice: row.meal_choice_id ? { id: row.meal_choice_id, code: row.meal_choice_code, labelLb: row.meal_choice_label_lb } : undefined,
    updatedAt: row.updated_at
  };
}

const BASE_JOIN = `
  FROM base_plans bp
  JOIN people p ON p.id = bp.person_id
  LEFT JOIN places pl ON pl.id = bp.place_id
  LEFT JOIN meal_choices mc ON mc.id = bp.meal_choice_id`;

const BASE_SELECT = `SELECT bp.*, p.last_name, p.first_name, p.is_encadrant, pl.name AS place_name, mc.code AS meal_choice_code, mc.label_lb AS meal_choice_label_lb`;

export async function listBasePlansForPerson(db, personId) {
  const rows = await db.query(`${BASE_SELECT} ${BASE_JOIN} WHERE bp.person_id = :personId ORDER BY bp.weekday ASC`, { personId });
  return rows.map(mapBasePlan);
}

export async function listBasePlansByService(db) {
  const rows = await db.query(`${BASE_SELECT} ${BASE_JOIN} WHERE bp.active = 1 ORDER BY pl.sort_order ASC, bp.weekday ASC, p.is_encadrant DESC, p.last_name ASC`, {});
  const grouped = new Map();
  for (const row of rows.map(mapBasePlan)) {
    const key = row.place?.id || 0;
    if (!grouped.has(key)) grouped.set(key, { place: row.place || null, weekdays: { 1: [], 2: [], 3: [], 4: [], 5: [] } });
    grouped.get(key).weekdays[row.weekday]?.push(row);
  }
  return [...grouped.values()];
}

export async function upsertBasePlans(db, personId, entries) {
  return db.transaction(async (tx) => {
    for (const entry of entries) {
      await tx.query(
        `INSERT INTO base_plans (person_id, weekday, place_id, meal_choice_id, comment, active)
         VALUES (:personId, :weekday, :placeId, :mealChoiceId, :comment, :active)
         ON DUPLICATE KEY UPDATE place_id = VALUES(place_id), meal_choice_id = VALUES(meal_choice_id), comment = VALUES(comment), active = VALUES(active), updated_at = UTC_TIMESTAMP()`,
        { personId, ...entry }
      );
    }
    return listBasePlansForPerson(db, personId);
  });
}

export async function missingRegistrationsForDate(db, date, weekday) {
  const rows = await db.query(
    `SELECT p.id AS person_id, p.last_name, p.first_name, p.is_encadrant, pl.id AS place_id, pl.name AS place_name,
            bp.meal_choice_id, mc.code AS meal_choice_code, mc.label_lb AS meal_choice_label_lb
       FROM base_plans bp
       JOIN people p ON p.id = bp.person_id AND p.active = 1 AND p.meal_registration_enabled = 1
       LEFT JOIN places pl ON pl.id = bp.place_id
       LEFT JOIN meal_choices mc ON mc.id = bp.meal_choice_id
       LEFT JOIN meal_registrations mr ON mr.person_id = bp.person_id AND mr.date = :date
      WHERE bp.weekday = :weekday AND bp.active = 1 AND mr.id IS NULL
      ORDER BY pl.sort_order ASC, p.is_encadrant DESC, p.last_name ASC, p.first_name ASC`,
    { date, weekday }
  );
  return rows.map((row) => ({
    person: { id: row.person_id, lastName: row.last_name, firstName: row.first_name, isEncadrant: Boolean(row.is_encadrant) },
    place: row.place_id ? { id: row.place_id, name: row.place_name } : null,
    defaultMealChoice: row.meal_choice_id ? { id: row.meal_choice_id, code: row.meal_choice_code, labelLb: row.meal_choice_label_lb } : null,
    date
  }));
}
