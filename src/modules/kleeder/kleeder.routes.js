import { created, ok } from '../../utils/http.js';
import { asInt, asString, optionalString, requireObject } from '../../utils/validation.js';
import { notFound } from '../../utils/errors.js';

function item(row) {
  return row ? { id: row.id, artikel: row.article, description: row.description, wert: Number(row.value || 0), typ: row.type_label || null } : null;
}

function assignment(row) {
  return row ? {
    id: row.id,
    datum: row.created_at,
    sum: Number(row.total || 0),
    unzuel: row.quantity,
    greisst: row.size_label,
    remark: row.remark,
    ok: Boolean(row.ok),
    Persoun: row.person_id ? { id: row.person_id, numm: row.last_name, virnumm: row.first_name, encadrant: row.is_encadrant ? 1 : 0 } : null,
    Service: row.place_id ? { id: row.place_id, service: row.place_name } : null,
    Kleedung: row.item_id ? { id: row.item_id, artikel: row.article, description: row.description, wert: Number(row.value || 0), typ: row.type_label || null } : null
  } : null;
}

const ASSIGNMENT_SELECT = `SELECT ca.*, p.id AS person_id, p.last_name, p.first_name, p.is_encadrant, pl.id AS place_id, pl.name AS place_name,
  ci.id AS item_id, ci.article, ci.description, ci.value, ci.type_label
  FROM clothing_assignments ca
  JOIN people p ON p.id = ca.person_id
  LEFT JOIN places pl ON pl.id = ca.place_id
  JOIN clothing_items ci ON ci.id = ca.item_id`;

export default async function kleederRoutes(app) {
  app.get('/getKleeder', async (request) => (await request.server.db.query('SELECT * FROM clothing_items ORDER BY article ASC')).map(item));
  app.get('/getKleeder/:ignored', async (request) => (await request.server.db.query('SELECT * FROM clothing_items ORDER BY article ASC')).map(item));

  app.get('/getKleed/:id', async (request) => {
    const row = await request.server.db.one('SELECT * FROM clothing_items WHERE id = :id', { id: asInt(request.params.id) });
    if (!row) throw notFound('CLOTHING_ITEM_NOT_FOUND', 'Clothing item not found');
    return item(row);
  });

  app.get('/getPersonalKleeder', async (request) => (await request.server.db.query(`${ASSIGNMENT_SELECT} ORDER BY ca.created_at DESC`)).map(assignment));

  app.get('/getPersonalKleed/:id', async (request) => {
    const row = await request.server.db.one(`${ASSIGNMENT_SELECT} WHERE ca.id = :id`, { id: asInt(request.params.id) });
    if (!row) throw notFound('CLOTHING_ASSIGNMENT_NOT_FOUND', 'Assignment not found');
    return assignment(row);
  });

  app.get('/getKleederForPersoun/:id', async (request) => {
    const rows = await request.server.db.query(`${ASSIGNMENT_SELECT} WHERE ca.person_id = :id ORDER BY ca.created_at DESC`, { id: asInt(request.params.id) });
    return rows.map(assignment);
  });

  app.post('/createKleed', async (request, reply) => {
    const b = requireObject(request.body);
    const id = await request.server.db.insert(
      'INSERT INTO clothing_items (article, description, value, type_label) VALUES (:article, :description, :value, :typeLabel)',
      { article: asString(b.Artikel ?? b.article, 'Artikel'), description: optionalString(b.Description ?? b.description, 'Description'), value: Number(String(b.Wert ?? b.value ?? 0).replace(',', '.')), typeLabel: optionalString(b.typ ?? b.typeLabel, 'typeLabel') }
    );
    const row = await request.server.db.one('SELECT * FROM clothing_items WHERE id = :id', { id });
    return created(reply, item(row));
  });

  app.post('/createKleedForPersoun', async (request, reply) => {
    const b = requireObject(request.body);
    const itemId = asInt(b.Kleedung ?? b.itemId, 'Kleedung');
    const quantity = asInt(b.Unzuel ?? b.quantity, 'Unzuel');
    const itemRow = await request.server.db.one('SELECT value FROM clothing_items WHERE id = :id', { id: itemId });
    const id = await request.server.db.insert(
      `INSERT INTO clothing_assignments (person_id, item_id, place_id, quantity, total, size_label, remark, ok)
       VALUES (:personId, :itemId, :placeId, :quantity, :total, :sizeLabel, :remark, :ok)`,
      { personId: asInt(b.Personal ?? b.personId, 'Personal'), itemId, placeId: asInt(b.Service ?? b.placeId, 'Service'), quantity, total: quantity * Number(itemRow?.value || 0), sizeLabel: optionalString(b.Greisst ?? b.sizeLabel, 'sizeLabel'), remark: optionalString(b.Remark ?? b.remark, 'remark'), ok: b.ok ? 1 : 0 }
    );
    const row = await request.server.db.one(`${ASSIGNMENT_SELECT} WHERE ca.id = :id`, { id });
    return created(reply, assignment(row));
  });

  app.put('/putKleed', async (request) => {
    const b = requireObject(request.body);
    const id = asInt(b.id, 'id');
    await request.server.db.query(
      'UPDATE clothing_items SET article = :article, description = :description, value = :value, type_label = :typeLabel WHERE id = :id',
      { id, article: asString(b.Artikel ?? b.article, 'Artikel'), description: optionalString(b.Description ?? b.description, 'Description'), value: Number(String(b.Wert ?? b.value ?? 0).replace(',', '.')), typeLabel: optionalString(b.typ ?? b.typeLabel, 'typeLabel') }
    );
    return item(await request.server.db.one('SELECT * FROM clothing_items WHERE id = :id', { id }));
  });

  app.put('/putKleedForPersoun', async (request) => {
    const b = requireObject(request.body);
    const id = asInt(b.id, 'id');
    const itemId = asInt(b.Kleedung ?? b.itemId, 'Kleedung');
    const quantity = asInt(b.Unzuel ?? b.quantity, 'Unzuel');
    const total = b.Sum !== undefined ? Number(String(b.Sum).replace(',', '.')) : quantity * Number((await request.server.db.one('SELECT value FROM clothing_items WHERE id = :id', { id: itemId }))?.value || 0);
    await request.server.db.query(
      `UPDATE clothing_assignments SET person_id = :personId, item_id = :itemId, place_id = :placeId, quantity = :quantity, total = :total, size_label = :sizeLabel, remark = :remark, ok = :ok WHERE id = :id`,
      { id, personId: asInt(b.Personal ?? b.personId, 'Personal'), itemId, placeId: asInt(b.Service ?? b.placeId, 'Service'), quantity, total, sizeLabel: optionalString(b.Greisst ?? b.sizeLabel, 'sizeLabel'), remark: optionalString(b.Remark ?? b.remark, 'remark'), ok: b.ok ? 1 : 0 }
    );
    return assignment(await request.server.db.one(`${ASSIGNMENT_SELECT} WHERE ca.id = :id`, { id }));
  });

  // Modern JSON aliases for Codex/workflow extension.
  app.get('/items', async (request) => ok((await request.server.db.query('SELECT * FROM clothing_items ORDER BY article ASC')).map(item)));
  app.get('/assignments', async (request) => ok((await request.server.db.query(`${ASSIGNMENT_SELECT} ORDER BY ca.created_at DESC`)).map(assignment)));
}
