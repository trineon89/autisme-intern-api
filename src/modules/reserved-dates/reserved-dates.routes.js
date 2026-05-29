import { ok, created, deleted } from '../../utils/http.js';
import { asApiDate, asBool, optionalString, requireObject } from '../../utils/validation.js';
import { deleteReservedDate, fixReservedDateRegistrations, listReservedDates, upsertReservedDate } from './reserved-dates.repository.js';

export default async function reservedDateRoutes(app) {
  app.get('/', async (request) => ok(await listReservedDates(request.server.db)));

  app.post('/', async (request, reply) => {
    const body = requireObject(request.body);
    return created(reply, await upsertReservedDate(request.server.db, {
      date: asApiDate(body.date, 'date'),
      label: optionalString(body.label, 'label', 255),
      mode: optionalString(body.mode, 'mode', 40) || 'reserved',
      forceNoMeal: asBool(body.forceNoMeal ?? body.force_no_meal ?? true) ? 1 : 0,
      createdBy: request.user?.id || null
    }));
  });

  app.delete('/:date', async (request, reply) => {
    await deleteReservedDate(request.server.db, asApiDate(request.params.date, 'date'));
    return deleted(reply);
  });

  app.post('/fix-registrations', async (request) => ok(await fixReservedDateRegistrations(request.server.db)));
}
