import { ok, created } from '../../utils/http.js';
import { asApiDate, asBool, optionalString, requireObject } from '../../utils/validation.js';
import { badRequest, notFound } from '../../utils/errors.js';
import { isMonday } from '../../utils/date.js';
import { getLatestWeeklyMenu, getWeeklyMenu, renderWeeklyHtml, upsertWeeklyMenu } from './weekly-menus.repository.js';

export default async function weeklyMenuRoutes(app) {
  app.get('/', async (request) => {
    const mondayDate = asApiDate(request.query.monday_date, 'monday_date');
    const menu = await getWeeklyMenu(request.server.db, mondayDate);
    if (!menu) throw notFound('WEEKLY_MENU_NOT_FOUND', 'Weekly menu not found');
    return ok(menu);
  });

  app.get('/latest', async (request) => {
    const menu = await getLatestWeeklyMenu(request.server.db);
    if (!menu) throw notFound('WEEKLY_MENU_NOT_FOUND', 'Weekly menu not found');
    return ok(menu);
  });

  app.get('/latest/html', async (request, reply) => {
    const menu = await getLatestWeeklyMenu(request.server.db);
    reply.type('text/html; charset=utf-8');
    return renderWeeklyHtml(menu);
  });

  app.get('/latest/mailchimp', async (request, reply) => {
    const menu = await getLatestWeeklyMenu(request.server.db);
    const html = menu?.exports?.mailchimpHtml || renderWeeklyHtml(menu);
    reply.type('text/html; charset=utf-8');
    return html;
  });

  app.get('/latest/pdf/:type', async (request, reply) => {
    const menu = await getLatestWeeklyMenu(request.server.db);
    if (!menu) throw notFound('WEEKLY_MENU_NOT_FOUND', 'Weekly menu not found');
    const link = menu.exports?.pdf?.[request.params.type] || null;
    if (!link) throw notFound('PDF_NOT_FOUND', 'Requested menu PDF was not generated yet');
    reply.redirect(link);
  });

  app.post('/', async (request, reply) => {
    const body = requireObject(request.body);
    const mondayDate = asApiDate(body.mondayDate ?? body.monday_date, 'mondayDate');
    if (!isMonday(mondayDate)) throw badRequest('MONDAY_REQUIRED', 'mondayDate must be a Monday');
    const data = {
      mondayDate,
      status: optionalString(body.status, 'status', 40) || 'published',
      title: optionalString(body.title, 'title', 255),
      menuJson: JSON.stringify(body.menu ?? body.payload ?? {}),
      exportsJson: JSON.stringify(body.exports ?? {}),
      publicHidden: asBool(body.publicHidden ?? body.public_hidden ?? false) ? 1 : 0,
      createdBy: request.user?.id || null
    };
    return created(reply, await upsertWeeklyMenu(request.server.db, data));
  });
}
