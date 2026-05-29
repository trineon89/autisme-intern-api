export function mapReservedDate(row) {
  if (!row) return null;
  return {
    date: row.date,
    label: row.label,
    mode: row.mode,
    forceNoMeal: Boolean(row.force_no_meal),
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export async function listReservedDates(db) {
  const rows = await db.query('SELECT * FROM reserved_dates ORDER BY date ASC');
  return rows.map(mapReservedDate);
}

export async function upsertReservedDate(db, data) {
  await db.query(
    `INSERT INTO reserved_dates (date, label, mode, force_no_meal, created_by)
     VALUES (:date, :label, :mode, :forceNoMeal, :createdBy)
     ON DUPLICATE KEY UPDATE label = VALUES(label), mode = VALUES(mode), force_no_meal = VALUES(force_no_meal)`,
    data
  );
  return mapReservedDate(await db.one('SELECT * FROM reserved_dates WHERE date = :date', { date: data.date }));
}

export async function deleteReservedDate(db, date) {
  await db.query('DELETE FROM reserved_dates WHERE date = :date', { date });
}

export async function fixReservedDateRegistrations(db) {
  const noMeal = await db.one('SELECT id FROM meal_choices WHERE is_no_meal = 1 ORDER BY sort_order ASC LIMIT 1');
  if (!noMeal) return { updated: 0, warning: 'No no-meal choice configured' };
  const result = await db.query(
    `UPDATE meal_registrations mr
       JOIN reserved_dates rd ON rd.date = mr.date AND rd.force_no_meal = 1
       SET mr.meal_choice_id = :mealChoiceId, mr.status = 'reserved_date', mr.updated_at = UTC_TIMESTAMP()` ,
    { mealChoiceId: noMeal.id }
  );
  return { updated: result.affectedRows || 0 };
}
