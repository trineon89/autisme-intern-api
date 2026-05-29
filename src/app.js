import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import path from 'node:path';
import fs from 'node:fs/promises';
import { loadEnv, validateEnv } from './config/env.js';
import { createDb } from './infrastructure/db.js';
import { securityHeaders } from './middleware/security.js';
import { corsHook } from './middleware/cors.js';
import { authHook } from './middleware/auth.js';
import { registerErrorHandler } from './middleware/error-handler.js';

import healthRoutes from './modules/health/health.routes.js';
import authRoutes from './modules/auth/auth.routes.js';
import bootstrapRoutes from './modules/bootstrap/bootstrap.routes.js';
import peopleRoutes from './modules/people/people.routes.js';
import placesRoutes from './modules/places/places.routes.js';
import mealChoiceRoutes from './modules/meal-choices/meal-choices.routes.js';
import weeklyMenuRoutes from './modules/weekly-menus/weekly-menus.routes.js';
import menuAssetRoutes from './modules/menu-assets/menu-assets.routes.js';
import basePlanRoutes from './modules/base-plans/base-plans.routes.js';
import mealRegistrationRoutes from './modules/meal-registrations/meal-registrations.routes.js';
import reportRoutes from './modules/reports/reports.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import reservedDateRoutes from './modules/reserved-dates/reserved-dates.routes.js';
import billingRoutes from './modules/billing/billing.routes.js';
import importRoutes from './modules/import/import.routes.js';
import legacyRoutes from './modules/legacy/legacy.routes.js';
import kleederRoutes from './modules/kleeder/kleeder.routes.js';
import commandeRoutes from './modules/commande/commande.routes.js';
import translationRoutes from './modules/translation/translation.routes.js';

export async function buildApp(options = {}) {
  const config = options.config || loadEnv();
  const missing = validateEnv(config);
  if (missing.length && config.isProduction) {
    throw new Error(`Missing required environment values: ${missing.join(', ')}`);
  }

  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers.x-api-key', 'password', '*.password', '*.token']
    },
    bodyLimit: config.maxUploadBytes,
    trustProxy: true
  });

  app.decorate('config', config);
  app.decorate('db', options.db || createDb(config));

  app.addHook('onRequest', securityHeaders);
  app.addHook('onRequest', corsHook);
  app.addHook('preHandler', authHook);

  await app.register(multipart, {
    limits: { fileSize: config.maxUploadBytes, files: 10, fields: 50 }
  });

  registerErrorHandler(app);

  app.get('/', async () => ({
    ok: true,
    name: 'api2.autisme.lu',
    version: '1.0.0',
    docs: '/docs/openapi.yaml',
    health: '/healthz'
  }));

  app.get('/docs/openapi.yaml', async (_request, reply) => {
    const file = await fs.readFile(path.resolve('docs/openapi.yaml'), 'utf8');
    reply.type('application/yaml; charset=utf-8').send(file);
  });


  app.get('/uploads/:filename', async (request, reply) => {
    const fileName = path.basename(request.params.filename);
    const filePath = path.resolve(config.uploadDir, fileName);
    const data = await fs.readFile(filePath);
    const type = fileName.toLowerCase().endsWith('.png') ? 'image/png'
      : fileName.toLowerCase().endsWith('.jpg') || fileName.toLowerCase().endsWith('.jpeg') ? 'image/jpeg'
      : fileName.toLowerCase().endsWith('.webp') ? 'image/webp'
      : 'application/octet-stream';
    reply.type(type).send(data);
  });

  await app.register(healthRoutes);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.register(bootstrapRoutes, { prefix: '/namnam' });
  await app.register(peopleRoutes, { prefix: '/people' });
  await app.register(placesRoutes, { prefix: '/places' });
  await app.register(mealChoiceRoutes, { prefix: '/meal-choices' });
  await app.register(weeklyMenuRoutes, { prefix: '/weekly-menus' });
  await app.register(menuAssetRoutes, { prefix: '/menu-assets' });
  await app.register(basePlanRoutes, { prefix: '/base-plans' });
  await app.register(mealRegistrationRoutes, { prefix: '/meal-registrations' });
  await app.register(reportRoutes, { prefix: '/reports' });
  await app.register(settingsRoutes, { prefix: '/settings' });
  await app.register(reservedDateRoutes, { prefix: '/reserved-dates' });
  await app.register(billingRoutes, { prefix: '/billing' });
  await app.register(importRoutes, { prefix: '/import' });

  // Non-NamNam legacy domains preserved from the old api.autisme.lu source.
  await app.register(kleederRoutes, { prefix: '/kleeder' });
  await app.register(commandeRoutes, { prefix: '/commande' });
  await app.register(translationRoutes, { prefix: '/translation' });
  await app.register(legacyRoutes);

  app.addHook('onClose', async () => app.db.end());
  return app;
}
