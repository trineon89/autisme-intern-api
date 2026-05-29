import { ok } from '../../utils/http.js';
import { getSettings } from '../settings/settings.repository.js';
import { listPeople } from '../people/people.repository.js';
import { listPlaces } from '../places/places.repository.js';
import { listMealChoices } from '../meal-choices/meal-choices.repository.js';
import { listReservedDates } from '../reserved-dates/reserved-dates.repository.js';

export default async function bootstrapRoutes(app) {
  app.get('/bootstrap', async (request) => {
    const [settings, people, places, mealChoices, reservedDates] = await Promise.all([
      getSettings(request.server.db),
      listPeople(request.server.db, { active: true }),
      listPlaces(request.server.db, { active: true }),
      listMealChoices(request.server.db, true),
      listReservedDates(request.server.db)
    ]);
    return ok({
      currentUser: request.user,
      settings,
      people,
      places,
      mealChoices,
      reservedDates,
      environment: request.server.config.appEnv
    });
  });
}
