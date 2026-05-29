import { ok, created, deleted } from '../../utils/http.js';
import { asApiDate, optionalString, requireObject } from '../../utils/validation.js';
import { billingData, deleteNonBillableDate, listNonBillableDates, upsertNonBillableDate } from './billing.repository.js';

export default async function billingRoutes(app) {
  app.get('/data', async (request) => ok(await billingData(request.server.db, request.query.month, request.query.category || null)));
  app.get('/non-billable-dates', async (request) => ok(await listNonBillableDates(request.server.db)));
  app.post('/non-billable-dates', async (request, reply) => {
    const body = requireObject(request.body);
    return created(reply, await upsertNonBillableDate(request.server.db, {
      date: asApiDate(body.date, 'date'),
      label: optionalString(body.label, 'label', 255),
      createdBy: request.user?.id || null
    }));
  });
  app.delete('/non-billable-dates/:date', async (request, reply) => {
    await deleteNonBillableDate(request.server.db, asApiDate(request.params.date, 'date'));
    return deleted(reply);
  });
}
