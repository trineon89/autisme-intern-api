import { ok, created } from '../../utils/http.js';
import { asBool, asInt, asString, optionalInt, optionalString, requireObject } from '../../utils/validation.js';
import { notFound } from '../../utils/errors.js';
import { createPlace, getPlace, listPlaces, patchPlace } from './places.repository.js';

function payload(body, partial = false) {
  const b = requireObject(body);
  const data = {};
  if (!partial || b.name !== undefined || b.service !== undefined) data.name = asString(b.name ?? b.service, 'name');
  if (b.legacyId !== undefined) data.legacyId = optionalInt(b.legacyId, 'legacyId');
  if (b.groupKey !== undefined) data.groupKey = optionalString(b.groupKey, 'groupKey', 80);
  if (b.groupLabel !== undefined) data.groupLabel = optionalString(b.groupLabel, 'groupLabel', 120);
  if (b.timeLabel !== undefined) data.timeLabel = optionalString(b.timeLabel, 'timeLabel', 120);
  if (b.columnsCount !== undefined) data.columnsCount = optionalInt(b.columnsCount, 'columnsCount') ?? 1;
  if (b.blocksMealEntry !== undefined) data.blocksMealEntry = asBool(b.blocksMealEntry);
  if (b.active !== undefined) data.active = asBool(b.active);
  if (b.sortOrder !== undefined) data.sortOrder = optionalInt(b.sortOrder, 'sortOrder') ?? 100;
  if (b.metadata !== undefined) data.metadata = b.metadata;
  if (!partial) {
    data.legacyId ??= null;
    data.groupKey ??= null;
    data.groupLabel ??= null;
    data.timeLabel ??= null;
    data.columnsCount ??= 1;
    data.blocksMealEntry ??= false;
    data.active ??= true;
    data.sortOrder ??= 100;
    data.metadata = JSON.stringify(data.metadata ?? {});
  }
  return data;
}

export default async function placesRoutes(app) {
  app.get('/', async (request) => ok(await listPlaces(request.server.db, { active: request.query.active === undefined ? undefined : asBool(request.query.active) })));

  app.get('/:id', async (request) => {
    const place = await getPlace(request.server.db, asInt(request.params.id));
    if (!place) throw notFound('PLACE_NOT_FOUND', 'Place not found');
    return ok(place);
  });

  app.post('/', async (request, reply) => created(reply, await createPlace(request.server.db, payload(request.body))));

  app.patch('/:id', async (request) => {
    const id = asInt(request.params.id);
    if (!(await getPlace(request.server.db, id))) throw notFound('PLACE_NOT_FOUND', 'Place not found');
    return ok(await patchPlace(request.server.db, id, payload(request.body, true)));
  });
}
