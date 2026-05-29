export default async function healthRoutes(app) {
  app.get('/health', health);
  app.get('/healthz', health);
  app.get('/readyz', async (request, reply) => {
    try {
      await request.server.db.one('SELECT 1 AS ok');
      return { ok: true, status: 'ready' };
    } catch {
      reply.code(503);
      return { ok: false, status: 'not_ready' };
    }
  });
  app.get('/meta', async (request) => ({
    ok: true,
    data: {
      app: 'api2.autisme.lu',
      environment: request.server.config.appEnv,
      authRequired: request.server.config.authRequired
    }
  }));
}

async function health() {
  return { ok: true, status: 'healthy' };
}
