export async function reportData(db, filters = {}) {
  const where = [];
  const params = {};
  if (filters.from) { where.push('mr.date >= :from'); params.from = filters.from; }
  if (filters.until) { where.push('mr.date <= :until'); params.until = filters.until; }
  if (filters.personId) { where.push('mr.person_id = :personId'); params.personId = filters.personId; }
  if (filters.placeId) { where.push('mr.place_id = :placeId'); params.placeId = filters.placeId; }
  if (filters.mealChoiceId) { where.push('mr.meal_choice_id = :mealChoiceId'); params.mealChoiceId = filters.mealChoiceId; }
  const rows = await db.query(
    `SELECT mr.id, mr.date, mr.comment, mr.status,
            p.id AS person_id, p.last_name, p.first_name, p.is_encadrant,
            pl.id AS place_id, pl.name AS place_name, pl.group_key, pl.group_label,
            mc.id AS meal_choice_id, mc.code AS meal_choice_code, mc.label_lb AS meal_choice_label_lb
       FROM meal_registrations mr
       JOIN people p ON p.id = mr.person_id
       LEFT JOIN places pl ON pl.id = mr.place_id
       LEFT JOIN meal_choices mc ON mc.id = mr.meal_choice_id
      ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY pl.sort_order ASC, mr.date ASC, p.last_name ASC, p.first_name ASC`,
    params
  );
  const groups = new Map();
  for (const row of rows) {
    const key = row.group_label || row.place_name || 'Auswäerts';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      id: row.id,
      person: { id: row.person_id, lastName: row.last_name, firstName: row.first_name, isEncadrant: Boolean(row.is_encadrant) },
      date: row.date,
      mealChoice: row.meal_choice_id ? { id: row.meal_choice_id, code: row.meal_choice_code, labelLb: row.meal_choice_label_lb } : null,
      place: row.place_id ? { id: row.place_id, name: row.place_name, groupKey: row.group_key, groupLabel: row.group_label } : null,
      comment: row.comment,
      status: row.status
    });
  }
  return { rows: [...groups.entries()].map(([group, items]) => ({ group, items })), total: rows.length };
}

export function mapGeneratedReport(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    filename: row.filename,
    url: row.url,
    mimeType: row.mime_type,
    createdBy: row.created_by,
    createdAt: row.created_at
  };
}

export async function insertGeneratedReport(db, report) {
  const id = await db.insert(
    `INSERT INTO generated_reports (type, filename, url, storage_path, mime_type, filters_json, created_by)
     VALUES (:type, :filename, :url, :storagePath, :mimeType, :filtersJson, :createdBy)`,
    report
  );
  return mapGeneratedReport(await db.one('SELECT * FROM generated_reports WHERE id = :id', { id }));
}

export async function listGeneratedReports(db) {
  const rows = await db.query('SELECT * FROM generated_reports WHERE deleted_at IS NULL ORDER BY created_at DESC, id DESC');
  return rows.map(mapGeneratedReport);
}

export async function getGeneratedReport(db, id) {
  return await db.one('SELECT * FROM generated_reports WHERE id = :id AND deleted_at IS NULL', { id });
}

export async function deleteGeneratedReport(db, id) {
  await db.query('UPDATE generated_reports SET deleted_at = UTC_TIMESTAMP() WHERE id = :id', { id });
}
