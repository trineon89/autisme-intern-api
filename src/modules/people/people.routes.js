import { ok, created } from '../../utils/http.js';
import { asBool, asInt, asString, optionalInt, optionalString, requireObject } from '../../utils/validation.js';
import { notFound, badRequest } from '../../utils/errors.js';
import { createPerson, getPerson, listPeople, patchPerson } from './people.repository.js';

function parseFilters(query) {
  const filters = {};
  if (query.active !== undefined) filters.active = asBool(query.active);
  if (query.meal_registration_enabled !== undefined) filters.mealRegistrationEnabled = asBool(query.meal_registration_enabled);
  if (query.is_encadrant !== undefined) filters.isEncadrant = asBool(query.is_encadrant);
  if (query.q) filters.q = String(query.q).trim();
  if (query.billing_category) filters.billingCategory = String(query.billing_category).trim();
  return filters;
}

function normalizePersonPayload(body, partial = false) {
  const out = {};
  const b = requireObject(body);
  if (!partial || b.lastName !== undefined || b.numm !== undefined) out.lastName = asString(b.lastName ?? b.numm, 'lastName');
  if (!partial || b.firstName !== undefined || b.virnumm !== undefined) out.firstName = asString(b.firstName ?? b.virnumm, 'firstName');
  if (b.displayName !== undefined) out.displayName = optionalString(b.displayName, 'displayName');
  if (b.legacyId !== undefined) out.legacyId = optionalInt(b.legacyId, 'legacyId');
  if (b.birthDate !== undefined) out.birthDate = optionalString(b.birthDate, 'birthDate', 10);
  if (b.photoUrl !== undefined) out.photoUrl = optionalString(b.photoUrl, 'photoUrl', 500);
  if (b.isEncadrant !== undefined) out.isEncadrant = asBool(b.isEncadrant);
  if (b.hasBasePlan !== undefined) out.hasBasePlan = asBool(b.hasBasePlan);
  if (b.mealRegistrationEnabled !== undefined) out.mealRegistrationEnabled = asBool(b.mealRegistrationEnabled);
  if (b.billingCategory !== undefined) out.billingCategory = optionalString(b.billingCategory, 'billingCategory', 80);
  if (b.defaultPlaceId !== undefined) out.defaultPlaceId = optionalInt(b.defaultPlaceId, 'defaultPlaceId');
  if (b.active !== undefined) out.active = asBool(b.active);
  if (b.sortOrder !== undefined) out.sortOrder = optionalInt(b.sortOrder, 'sortOrder') ?? 100;
  if (b.notes !== undefined) out.notes = optionalString(b.notes, 'notes', 1000);
  if (b.metadata !== undefined) out.metadata = b.metadata;
  if (!partial) {
    out.displayName ??= `${out.firstName} ${out.lastName}`.trim();
    out.legacyId ??= null;
    out.birthDate ??= null;
    out.photoUrl ??= null;
    out.isEncadrant ??= false;
    out.hasBasePlan ??= true;
    out.mealRegistrationEnabled ??= true;
    out.billingCategory ??= null;
    out.defaultPlaceId ??= null;
    out.active ??= true;
    out.sortOrder ??= 100;
    out.notes ??= null;
    out.metadata = JSON.stringify(out.metadata ?? {});
  } else if (out.metadata !== undefined) {
    out.metadata = out.metadata ?? {};
  }
  return out;
}

export default async function peopleRoutes(app) {
  app.get('/', async (request) => ok(await listPeople(request.server.db, parseFilters(request.query))));

  app.get('/:id', async (request) => {
    const person = await getPerson(request.server.db, asInt(request.params.id));
    if (!person) throw notFound('PERSON_NOT_FOUND', 'Person not found');
    return ok(person);
  });

  app.post('/', async (request, reply) => {
    const person = await createPerson(request.server.db, normalizePersonPayload(request.body));
    return created(reply, person);
  });

  app.patch('/:id', async (request) => {
    const id = asInt(request.params.id);
    if (!(await getPerson(request.server.db, id))) throw notFound('PERSON_NOT_FOUND', 'Person not found');
    return ok(await patchPerson(request.server.db, id, normalizePersonPayload(request.body, true)));
  });

  app.patch('/:id/toggle', async (request) => {
    const id = asInt(request.params.id);
    const { field, value } = requireObject(request.body);
    const allowed = new Map([
      ['active', 'active'],
      ['isEncadrant', 'isEncadrant'],
      ['hasBasePlan', 'hasBasePlan'],
      ['mealRegistrationEnabled', 'mealRegistrationEnabled']
    ]);
    if (!allowed.has(field)) throw badRequest('INVALID_TOGGLE_FIELD', 'Unsupported toggle field');
    return ok(await patchPerson(request.server.db, id, { [allowed.get(field)]: asBool(value) }));
  });

  app.patch('/:id/billing-category', async (request) => {
    const id = asInt(request.params.id);
    const category = optionalString(requireObject(request.body).billingCategory, 'billingCategory', 80);
    return ok(await patchPerson(request.server.db, id, { billingCategory: category }));
  });
}
