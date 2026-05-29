import { ok } from '../../utils/http.js';
import { requireObject } from '../../utils/validation.js';
import { getSettings, patchSettings } from './settings.repository.js';

export default async function settingsRoutes(app) {
  app.get('/', async (request) => ok(await getSettings(request.server.db)));
  app.patch('/', async (request) => ok(await patchSettings(request.server.db, requireObject(request.body))));
}
