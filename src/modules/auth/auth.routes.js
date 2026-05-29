import { ok } from '../../utils/http.js';
import { asString } from '../../utils/validation.js';
import { unauthorized } from '../../utils/errors.js';
import { createOpaqueToken, hashToken } from '../../infrastructure/tokens.js';
import { verifyPassword } from '../../infrastructure/password.js';
import { createSession, findUserByEmail, findUserById, mapUser, revokeSession, revokeToken } from './auth.repository.js';

function expiry(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

export default async function authRoutes(app) {
  app.post('/login', async (request, reply) => {
    const email = asString(request.body?.email, 'email', 255).toLowerCase();
    const password = asString(request.body?.password, 'password', 4096);
    const user = await findUserByEmail(request.server.db, email);
    if (!user || !user.active) throw unauthorized('Invalid email or password');
    const valid = await verifyPassword(password, user.password_hash, request.server.config.passwordPepper);
    if (!valid) throw unauthorized('Invalid email or password');
    const token = createOpaqueToken();
    await createSession(request.server.db, {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: expiry(request.server.config.sessionTtlHours),
      userAgent: request.headers['user-agent'] || null,
      ipAddress: request.ip || null
    });
    reply.code(201);
    return ok({ token, tokenType: 'Bearer', expiresInHours: request.server.config.sessionTtlHours, user: mapUser(user) });
  });

  app.post('/logout', async (request) => {
    const auth = request.headers.authorization || '';
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match) await revokeToken(request.server.db, hashToken(match[1]));
    else if (request.user?.sessionId) await revokeSession(request.server.db, request.user.sessionId);
    return ok({ loggedOut: true });
  });

  app.get('/me', async (request) => ok(await findUserById(request.server.db, request.user.id)));

  app.post('/refresh', async (request, reply) => {
    await revokeSession(request.server.db, request.user.sessionId);
    const token = createOpaqueToken();
    await createSession(request.server.db, {
      userId: request.user.id,
      tokenHash: hashToken(token),
      expiresAt: expiry(request.server.config.sessionTtlHours),
      userAgent: request.headers['user-agent'] || null,
      ipAddress: request.ip || null
    });
    reply.code(201);
    return ok({ token, tokenType: 'Bearer', expiresInHours: request.server.config.sessionTtlHours, user: await findUserById(request.server.db, request.user.id) });
  });
}
