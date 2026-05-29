import { ok, created } from '../../utils/http.js';
import { asApiDate, asInt, optionalInt, optionalString, requireObject } from '../../utils/validation.js';
import { badRequest } from '../../utils/errors.js';
import { addDays, isMonday } from '../../utils/date.js';
import { getRegistrationByPersonDate, listRegistrations, registrationWarnings, upsertRegistration, upsertWeek } from './meal-registrations.repository.js';

function registrationPayload(body, source = 'manual', createdBy = null) {
  const b = requireObject(body);
  return {
    personId: asInt(b.personId ?? b.person_id, 'personId'),
    date: asApiDate(b.date, 'date'),
    placeId: optionalInt(b.placeId ?? b.place_id, 'placeId'),
    mealChoiceId: optionalInt(b.mealChoiceId ?? b.meal_choice_id, 'mealChoiceId'),
    comment: optionalString(b.comment, 'comment', 1000),
    source,
    status: optionalString(b.status, 'status', 40) || 'confirmed',
    createdBy
  };
}

export default async function mealRegistrationRoutes(app) {
  app.get('/', async (request) => ok(await listRegistrations(request.server.db, {
    from: request.query.from,
    until: request.query.until,
    personId: request.query.person_id ? asInt(request.query.person_id, 'person_id') : null,
    placeId: request.query.place_id ? asInt(request.query.place_id, 'place_id') : null,
    mealChoiceId: request.query.meal_choice_id ? asInt(request.query.meal_choice_id, 'meal_choice_id') : null
  })));

  app.get('/by-person-date', async (request) => {
    const personId = asInt(request.query.person_id, 'person_id');
    const date = asApiDate(request.query.date, 'date');
    const registration = await getRegistrationByPersonDate(request.server.db, personId, date);
    const warnings = await registrationWarnings(request.server.db, personId, date, registration?.placeId);
    return ok({ registration, warnings });
  });

  app.post('/single', async (request, reply) => {
    const payload = registrationPayload(request.body, 'single', request.user?.id || null);
    const warnings = await registrationWarnings(request.server.db, payload.personId, payload.date, payload.placeId);
    const registration = await upsertRegistration(request.server.db, payload);
    return created(reply, { registration, warnings });
  });

  app.post('/week', async (request, reply) => {
    const body = requireObject(request.body);
    const personId = asInt(body.personId ?? body.person_id, 'personId');
    const mondayDate = asApiDate(body.mondayDate ?? body.monday_date, 'mondayDate');
    if (!isMonday(mondayDate)) throw badRequest('MONDAY_REQUIRED', 'mondayDate must be a Monday');
    const entries = Array.isArray(body.entries) ? body.entries : [];
    if (!entries.length) throw badRequest('ENTRIES_REQUIRED', 'entries is required');
    const normalized = entries.map((entry, index) => ({
      date: asApiDate(entry.date || addDays(mondayDate, index), 'entry.date'),
      placeId: optionalInt(entry.placeId ?? entry.place_id, 'placeId'),
      mealChoiceId: optionalInt(entry.mealChoiceId ?? entry.meal_choice_id, 'mealChoiceId'),
      comment: optionalString(entry.comment, 'comment', 1000),
      source: 'week',
      status: optionalString(entry.status, 'status', 40) || 'confirmed'
    }));
    return created(reply, await upsertWeek(request.server.db, personId, normalized, request.user?.id || null));
  });

  app.post('/return-from-leave', async (request, reply) => {
    const body = requireObject(request.body);
    const personId = asInt(body.personId ?? body.person_id, 'personId');
    const entries = Array.isArray(body.entries) ? body.entries : [];
    const normalized = entries.map((entry) => ({
      date: asApiDate(entry.date, 'entry.date'),
      placeId: optionalInt(entry.placeId ?? entry.place_id, 'placeId'),
      mealChoiceId: optionalInt(entry.mealChoiceId ?? entry.meal_choice_id, 'mealChoiceId'),
      comment: optionalString(entry.comment, 'comment', 1000),
      source: 'return_from_leave',
      status: 'confirmed'
    }));
    return created(reply, await upsertWeek(request.server.db, personId, normalized, request.user?.id || null));
  });
}
