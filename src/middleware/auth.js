import { unauthorized, forbidden } from '../utils/errors.js';
import { constantTimeEqual, hashToken } from '../infrastructure/tokens.js';

const PUBLIC_ROUTES = [
  ['GET', '/'],
  ['GET', '/health'],
  ['GET', '/healthz'],
  ['GET', '/readyz'],
  ['GET', '/meta'],
  ['GET', '/docs'],
  ['GET', '/docs/routes.json'],
  ['GET', '/docs/openapi.yaml'],
  ['POST', '/auth/login']
];

function isPublicRoute(method, path) {
  if (method === 'OPTIONS') return true;
  return PUBLIC_ROUTES.some(([m, p]) => method === m && path === p);
}

export async function authHook(request, reply) {
  const config = request.server.config;
  request.user = null;

  if (isPublicRoute(request.method, request.url.split('?')[0])) return;
  if (!config.authRequired) {
    request.user = { id: 0, email: 'development', role: 'admin', displayName: 'Development' };
    return;
  }

  const apiKey = request.headers['x-api-key'];
  if (apiKey && config.internalApiToken && constantTimeEqual(apiKey, config.internalApiToken)) {
    request.user = { id: 0, email: 'internal-api-token', role: 'system', displayName: 'Internal API' };
    return;
  }
  if (apiKey && config.legacyApiKey && constantTimeEqual(apiKey, config.legacyApiKey)) {
    request.user = { id: 0, email: 'legacy-api-key', role: 'legacy', displayName: 'Legacy client' };
    return;
  }

  const authorization = request.headers.authorization || '';
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) throw unauthorized();

  const token = match[1];
  const tokenHash = hashToken(token);
  const session = await request.server.db.one(
    `SELECT s.id, s.user_id, s.expires_at, u.email, u.display_name, u.role, u.active
       FROM api_sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = :tokenHash AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP()
      LIMIT 1`,
    { tokenHash }
  );

  if (!session || !session.active) throw unauthorized('Invalid or expired session');
  request.user = {
    id: session.user_id,
    email: session.email,
    displayName: session.display_name,
    role: session.role,
    sessionId: session.id
  };
}

export function requireRole(...roles) {
  return async function roleHook(request) {
    if (!request.user) throw unauthorized();
    if (request.user.role === 'system') return;
    if (!roles.includes(request.user.role)) throw forbidden('Your role is not allowed to perform this action');
  };
}
