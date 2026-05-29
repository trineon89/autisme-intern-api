export function mapMealChoice(row) {
  if (!row) return null;
  return {
    id: row.id,
    code: row.code,
    labelLb: row.label_lb,
    labelFr: row.label_fr,
    shortLabel: row.short_label,
    isNoMeal: Boolean(row.is_no_meal),
    active: Boolean(row.active),
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function listMealChoices(db, activeOnly = true) {
  const rows = await db.query(
    `SELECT * FROM meal_choices ${activeOnly ? 'WHERE active = 1' : ''} ORDER BY sort_order ASC, id ASC`
  );
  return rows.map(mapMealChoice);
}

export async function getMealChoiceByCode(db, code) {
  return mapMealChoice(await db.one('SELECT * FROM meal_choices WHERE code = :code', { code }));
}

export async function choicesForDay(db, date, mondayDate = null) {
  const choices = await listMealChoices(db, true);
  const menu = await db.one('SELECT * FROM weekly_menus WHERE monday_date = :mondayDate LIMIT 1', {
    mondayDate: mondayDate || date
  });
  return { choices, menu };
}
