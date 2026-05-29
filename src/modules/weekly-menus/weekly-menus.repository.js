import { parseJsonColumn } from '../../infrastructure/db.js';

export function mapWeeklyMenu(row) {
  if (!row) return null;
  return {
    id: row.id,
    mondayDate: row.monday_date,
    status: row.status,
    title: row.title,
    menu: parseJsonColumn(row.menu_json, {}),
    exports: parseJsonColumn(row.exports_json, {}),
    publicHidden: Boolean(row.public_hidden),
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function getWeeklyMenu(db, mondayDate) {
  return mapWeeklyMenu(await db.one('SELECT * FROM weekly_menus WHERE monday_date = :mondayDate LIMIT 1', { mondayDate }));
}

export async function getLatestWeeklyMenu(db) {
  return mapWeeklyMenu(await db.one('SELECT * FROM weekly_menus ORDER BY monday_date DESC LIMIT 1'));
}

export async function upsertWeeklyMenu(db, data) {
  await db.query(
    `INSERT INTO weekly_menus (monday_date, status, title, menu_json, exports_json, public_hidden, created_by)
     VALUES (:mondayDate, :status, :title, :menuJson, :exportsJson, :publicHidden, :createdBy)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       title = VALUES(title),
       menu_json = VALUES(menu_json),
       exports_json = VALUES(exports_json),
       public_hidden = VALUES(public_hidden),
       updated_at = UTC_TIMESTAMP()`,
    data
  );
  return getWeeklyMenu(db, data.mondayDate);
}

export function renderWeeklyHtml(menu) {
  if (!menu) return '<p>Ke Menu fonnt.</p>';
  const days = menu.menu?.days || {};
  const alternatives = menu.menu?.alternatives || {};
  const label = (value) => String(value || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const rows = [
    ['Lundi / Méindes', days.monday],
    ['Mardi / Dënschdes', days.tuesday],
    ['Mercredi / Mëttwoch', days.wednesday],
    ['Jeudi / Donneschdes', days.thursday],
    ['Vendredi / Freiden', days.friday]
  ].map(([day, item]) => `<tr><th>${day}</th><td>${label(item?.name)}</td><td>${label(item?.allergens)}</td></tr>`).join('');
  return `<!doctype html><html lang="lb"><head><meta charset="utf-8"><title>Menu ${label(menu.mondayDate)}</title></head><body><h1>Menu de la semaine</h1><table>${rows}</table><p>Alternative 1: ${label(alternatives.alternative1?.name)}</p><p>Alternative 2: ${label(alternatives.alternative2?.name)}</p></body></html>`;
}
