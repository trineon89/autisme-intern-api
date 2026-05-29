import { toLegacyMenu, toLegacyPerson, toLegacyService } from '../../utils/legacy.js';
import { asInt, requireObject } from '../../utils/validation.js';
import { mondayFor, todayApiDate } from '../../utils/date.js';
import { parseJsonColumn } from '../../infrastructure/db.js';

async function legacyPeople(db, body = null) {
  const where = [];
  const params = {};
  const filters = body?.filters || [];
  if (filters.includes('inscription-repas')) where.push('meal_registration_enabled = 1');
  if (filters.includes('active')) where.push('active = 1');
  if (filters.includes('encadrant')) where.push('is_encadrant = 1');
  if (filters.includes('not-encadrant')) where.push('is_encadrant = 0');
  if (body?.numm) { where.push('LOWER(last_name) LIKE LOWER(:numm)'); params.numm = `%${body.numm}%`; }
  if (body?.virnumm) { where.push('LOWER(first_name) LIKE LOWER(:virnumm)'); params.virnumm = `%${body.virnumm}%`; }
  if (body?.category) { where.push('billing_category = :category'); params.category = body.category; }
  const rows = await db.query(`SELECT * FROM people ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY sort_order ASC, last_name ASC`, params);
  return rows.map(toLegacyPerson);
}

async function legacyServices(db) {
  const rows = await db.query('SELECT * FROM places ORDER BY sort_order ASC, name ASC');
  return rows.map(toLegacyService);
}

async function legacyMenuByMonday(db, mondayDate) {
  const row = await db.one('SELECT * FROM weekly_menus WHERE monday_date = :mondayDate', { mondayDate });
  if (!row) return 'Empty result';
  return toLegacyMenu({ ...row, menu_json: parseJsonColumn(row.menu_json, {}) });
}

async function legacyMenuDay(db, date) {
  const monday = mondayFor(date);
  const menu = await legacyMenuByMonday(db, monday);
  if (typeof menu === 'string') return 'X040';
  const dayIndex = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][new Date(`${date}T00:00:00Z`).getUTCDay() - 1];
  if (!dayIndex) return 'NO MENU FOR THIS DATE';
  const row = await db.one('SELECT * FROM weekly_menus WHERE monday_date = :monday', { monday });
  const payload = parseJsonColumn(row.menu_json, {});
  const day = payload.days?.[dayIndex] || {};
  const alt1 = payload.alternatives?.alternative1 || {};
  const alt2 = payload.alternatives?.alternative2 || {};
  return {
    id: row.id,
    menu: day.name || null,
    'menu-allergenes': day.allergens || null,
    alternative1: alt1.name || null,
    'alternative1-allergenes': alt1.allergens || null,
    alternative2: alt2.name || null,
    'alternative2-allergenes': alt2.allergens || null
  };
}

async function plangMode(db, id) {
  const key = `id_${id}`;
  const row = await db.one('SELECT * FROM settings WHERE `key` = :key', { key });
  if (!row) return 'X040-70';
  return { id: key, config: parseJsonColumn(row.value_json, {}) };
}

async function plangContent(db, body = {}) {
  const date = body.thenextdate ? nextBusinessDate() : todayApiDate();
  const services = await legacyServices(db);
  const result = { Date: date, Services: [] };
  for (const service of services) {
    const rows = await db.query(
      `SELECT p.id, p.last_name, p.first_name, p.birth_date, p.photo_url, p.is_encadrant, w.block1_place_id, w.block2_place_id, w.block3_place_id, w.block4_place_id, w.info_json
         FROM work_plan_entries w JOIN people p ON p.id = w.person_id
        WHERE w.date = :date AND (:placeId IN (w.block1_place_id, w.block2_place_id, w.block3_place_id, w.block4_place_id))
        ORDER BY p.is_encadrant DESC, p.sort_order ASC, p.last_name ASC`,
      { date, placeId: service.idService }
    );
    const encadrantsMoies = [];
    const usagersMoies = [];
    const encadrantsMettes = [];
    const usagersMettes = [];
    for (const row of rows) {
      const person = { id: row.id, numm: row.last_name, virnumm: row.first_name, isencadrant: Boolean(row.is_encadrant), bday: row.birth_date, photo: row.photo_url, info: parseJsonColumn(row.info_json, null) };
      if ([row.block1_place_id, row.block2_place_id].includes(service.idService)) (row.is_encadrant ? encadrantsMoies : usagersMoies).push(person);
      if ([row.block3_place_id, row.block4_place_id].includes(service.idService)) (row.is_encadrant ? encadrantsMettes : usagersMettes).push(person);
    }
    result.Services.push({ name: service.dtService, id: service.idService, c: service.dtCols, auerzait: service.dtAuerzait, encadrantsMoies, usagersMoies, encadrantsMettes, usagersMettes });
  }
  return result;
}

function nextBusinessDate() {
  let date = new Date();
  date.setUTCDate(date.getUTCDate() + (date.getUTCDay() === 5 ? 3 : 1));
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

async function updatePlangUser(db, body) {
  const b = requireObject(body);
  const personId = asInt(b.concernuserid, 'concernuserid');
  const placeId = asInt(b.settoserviceid, 'settoserviceid');
  const date = b.datum;
  const info = asInt(b.info, 'info');
  const fields = info === 1 ? ['block1_place_id', 'block2_place_id', 'block3_place_id', 'block4_place_id'] : info === 2 ? ['block1_place_id', 'block2_place_id'] : info === 3 ? ['block3_place_id', 'block4_place_id'] : [];
  if (!fields.length) return 'X126';
  await db.query('INSERT IGNORE INTO work_plan_entries (date, person_id) VALUES (:date, :personId)', { date, personId });
  await db.query(`UPDATE work_plan_entries SET ${fields.map((field) => `${field} = :placeId`).join(', ')}, updated_at = UTC_TIMESTAMP() WHERE date = :date AND person_id = :personId`, { date, personId, placeId });
  return db.one('SELECT * FROM work_plan_entries WHERE date = :date AND person_id = :personId', { date, personId });
}

async function handleLegacyPath(request, reply, handler, action, id = null, extra = null) {
  const db = request.server.db;
  const body = request.body || {};
  if (handler === 'personal' && action === 'getPersonal') return legacyPeople(db, request.method === 'POST' ? body : null);
  if (handler === 'personal' && action === 'getPersoun') return toLegacyPerson(await db.one('SELECT * FROM people WHERE id = :id', { id: asInt(id) }));
  if (handler === 'service' && action === 'getServicen') return legacyServices(db);
  if (handler === 'service' && action === 'getService') return toLegacyService(await db.one('SELECT * FROM places WHERE id = :id', { id: asInt(id) }));
  if (handler === 'menu' && action === 'getMenus') {
    const rows = await db.query('SELECT * FROM weekly_menus ORDER BY monday_date DESC');
    return rows.map((row) => toLegacyMenu({ ...row, menu_json: parseJsonColumn(row.menu_json, {}) }));
  }
  if (handler === 'menu' && action === 'getMenu') return legacyMenuByMonday(db, id.includes('-') ? id : (await db.one('SELECT monday_date FROM weekly_menus WHERE id = :id', { id: asInt(id) }))?.monday_date);
  if (handler === 'menu' && action === 'getMenuDay') return legacyMenuDay(db, id);
  if (handler === 'menu' && action === 'getMenuForUser') return { menus: [], success: false, note: 'Use /meal-choices/for-day and /meal-registrations/by-person-date in the modern API.' };
  if (handler === 'plang' && action === 'getMode') return plangMode(db, id);
  if (handler === 'plang' && action === 'getContent') return plangContent(db, body);
  if (handler === 'plang' && action === 'updateUser') return updatePlangUser(db, body);
  if (handler === 'api' && action === 'ping') return { ok: true, headers: Object.keys(request.headers).filter((h) => !/authorization|cookie|api-key/i.test(h)) };

  const target = buildLegacyTarget(handler, action, id, extra, request.url);
  if (target) {
    const response = await request.server.inject({ method: request.method, url: target, headers: request.headers, payload: request.body });
    reply.code(response.statusCode).headers({ 'content-type': response.headers['content-type'] || 'application/json; charset=utf-8' });
    if (!response.payload) return null;
    try { return JSON.parse(response.payload); } catch { return response.payload; }
  }
  reply.code(404);
  return { ok: false, error: { code: 'LEGACY_ROUTE_NOT_FOUND', message: `${handler}/${action} not found` } };
}

function buildLegacyTarget(handler, action, id, extra) {
  const baseHandlers = new Set(['kleeder', 'commande', 'translation']);
  if (!baseHandlers.has(handler)) return null;
  let target = `/${handler}/${action}`;
  if (id) target += `/${encodeURIComponent(id)}`;
  if (extra) target += `/${encodeURIComponent(extra)}`;
  return target;
}

export default async function legacyRoutes(app) {
  app.all('/:handler/:action', async (request, reply) => handleLegacyPath(request, reply, request.params.handler, request.params.action));
  app.all('/:handler/:action/:id', async (request, reply) => handleLegacyPath(request, reply, request.params.handler, request.params.action, request.params.id));
  app.all('/:handler/:action/:id/:extra', async (request, reply) => handleLegacyPath(request, reply, request.params.handler, request.params.action, request.params.id, request.params.extra));

}
