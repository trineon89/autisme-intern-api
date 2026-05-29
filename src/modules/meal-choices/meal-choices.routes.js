import { ok } from '../../utils/http.js';
import { asApiDate } from '../../utils/validation.js';
import { mondayFor } from '../../utils/date.js';
import { parseJsonColumn } from '../../infrastructure/db.js';
import { listMealChoices, choicesForDay } from './meal-choices.repository.js';

export default async function mealChoiceRoutes(app) {
  app.get('/', async (request) => ok(await listMealChoices(request.server.db, request.query.active === undefined ? true : request.query.active !== 'false')));

  app.get('/for-day', async (request) => {
    const date = asApiDate(request.query.date, 'date');
    const monday = request.query.week ? asApiDate(request.query.week, 'week') : mondayFor(date);
    const { choices, menu } = await choicesForDay(request.server.db, date, monday);
    return ok({
      date,
      mondayDate: monday,
      choices,
      weeklyMenu: menu ? { id: menu.id, mondayDate: menu.monday_date, menu: parseJsonColumn(menu.menu_json, {}) } : null
    });
  });
}
