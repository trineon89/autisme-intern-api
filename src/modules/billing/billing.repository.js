import { monthBounds } from '../../utils/date.js';

export async function billingData(db, month, category = null) {
  const { from, until } = monthBounds(month);
  const params = { from, until };
  const where = ['mr.date BETWEEN :from AND :until'];
  if (category) {
    where.push('COALESCE(p.billing_category, "") = :category');
    params.category = category;
  }
  const rows = await db.query(
    `SELECT p.id AS person_id, p.last_name, p.first_name, p.billing_category,
            SUM(CASE WHEN mc.code = 'menu' THEN 1 ELSE 0 END) AS menu_count,
            SUM(CASE WHEN mc.code = 'alternative_1' THEN 1 ELSE 0 END) AS alternative_1_count,
            SUM(CASE WHEN mc.code = 'alternative_2' THEN 1 ELSE 0 END) AS alternative_2_count,
            SUM(CASE WHEN mc.code = 'sandwich' THEN 1 ELSE 0 END) AS sandwich_count,
            SUM(CASE WHEN mc.is_no_meal = 1 THEN 1 ELSE 0 END) AS no_meal_count,
            COUNT(*) AS total_count
       FROM meal_registrations mr
       JOIN people p ON p.id = mr.person_id
       LEFT JOIN meal_choices mc ON mc.id = mr.meal_choice_id
       LEFT JOIN non_billable_dates nbd ON nbd.date = mr.date
      WHERE ${where.join(' AND ')} AND nbd.date IS NULL
      GROUP BY p.id, p.last_name, p.first_name, p.billing_category
      ORDER BY p.last_name ASC, p.first_name ASC`,
    params
  );
  return {
    month,
    category,
    rows: rows.map((row) => ({
      person: { id: row.person_id, lastName: row.last_name, firstName: row.first_name },
      billingCategory: row.billing_category,
      counts: {
        menu: Number(row.menu_count || 0),
        alternative1: Number(row.alternative_1_count || 0),
        alternative2: Number(row.alternative_2_count || 0),
        sandwich: Number(row.sandwich_count || 0),
        noMeal: Number(row.no_meal_count || 0),
        total: Number(row.total_count || 0)
      }
    }))
  };
}

export function mapNonBillableDate(row) {
  return { date: row.date, label: row.label, createdAt: row.created_at, createdBy: row.created_by };
}

export async function listNonBillableDates(db) {
  const rows = await db.query('SELECT * FROM non_billable_dates ORDER BY date ASC');
  return rows.map(mapNonBillableDate);
}

export async function upsertNonBillableDate(db, data) {
  await db.query(
    `INSERT INTO non_billable_dates (date, label, created_by)
     VALUES (:date, :label, :createdBy)
     ON DUPLICATE KEY UPDATE label = VALUES(label)`,
    data
  );
  return mapNonBillableDate(await db.one('SELECT * FROM non_billable_dates WHERE date = :date', { date: data.date }));
}

export async function deleteNonBillableDate(db, date) {
  await db.query('DELETE FROM non_billable_dates WHERE date = :date', { date });
}
