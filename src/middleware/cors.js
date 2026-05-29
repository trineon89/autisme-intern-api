export async function corsHook(request, reply) {
  const origin = request.headers.origin;
  const allowed = request.server.config.corsOrigins;
  if (origin && allowed.includes(origin)) {
    reply.header('Access-Control-Allow-Origin', origin);
    reply.header('Vary', 'Origin');
    reply.header('Access-Control-Allow-Credentials', 'true');
  }
  reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-API-Key, X-Request-Id');
  reply.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  if (request.method === 'OPTIONS') {
    reply.code(204).send();
  }
}
