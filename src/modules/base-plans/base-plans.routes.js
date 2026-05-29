import { ok, created } from '../../utils/http.js';
import { asApiDate, asInt, optionalInt, optionalString, requireObject } from '../../utils/validation.js';
import { weekdayNumber } from '../../utils/date.js';
import { badRequest } from '../../utils/errors.js';
import { listBasePlansByService, listBasePlansForPerson, missingRegistrationsForDate, upsertBasePlans } from './base-plans.repository.js';

export default async function basePlanRoutes(app) {
  app.get('/', async (request) => {
    const personId = asInt(request.query.person_id, 'person_id');
    return ok(await listBasePlansForPerson(request.server.db, personId));
  });

  app.post('/', async (request, reply) => {
    const body = requireObject(request.body);
    const personId = asInt(body.personId ?? body.person_id, 'personId');
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (!entries.length) throw badRequest('ENTRIES_REQUIRED', 'entries is required');
    const normalized = entries.map((entry) => ({
      weekday: asInt(entry.weekday, 'weekday'),
      placeId: optionalInt(entry.placeId ?? entry.place_id, 'placeId'),
      mealChoiceId: optionalInt(entry.mealChoiceId ?? entry.meal_choice_id, 'mealChoiceId'),
      comment: optionalString(entry.comment, 'comment', 1000),
      active: entry.active === undefined ? 1 : entry.active ? 1 : 0
    }));
    return created(reply, await upsertBasePlans(request.server.db, personId, normalized));
  });

  app.get('/by-service', async (request) => ok(await listBasePlansByService(request.server.db)));

  app.get('/missing', async (request) => {
    const date = asApiDate(request.query.date, 'date');
    const weekday = weekdayNumber(date);
    if (!weekday || weekday > 5) return ok([]);
    return ok(await missingRegistrationsForDate(request.server.db, date, weekday));
  });
}
