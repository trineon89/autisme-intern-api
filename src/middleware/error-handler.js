import { ApiError } from '../utils/errors.js';

const SECRET_PATTERNS = [/password/i, /authorization/i, /cookie/i, /token/i];

function redact(value) {
  if (!value || typeof value !== 'object') return value;
  const out = Array.isArray(value) ? [] : {};
  for (const [key, inner] of Object.entries(value)) {
    out[key] = SECRET_PATTERNS.some((pattern) => pattern.test(key)) ? '[redacted]' : redact(inner);
  }
  return out;
}

export function registerErrorHandler(app) {
  app.setErrorHandler((error, request, reply) => {
    const isApi = error instanceof ApiError;
    const statusCode = isApi ? error.statusCode : error.statusCode || 500;
    const code = isApi ? error.code : statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR';
    const message = isApi ? error.message : statusCode === 404 ? 'Resource not found' : 'Internal server error';

    if (statusCode >= 500) {
      request.log.error({ err: error, requestId: request.id }, 'request failed');
    }

    reply.code(statusCode).send({
      ok: false,
      error: {
        code,
        message,
        ...(isApi && error.details ? { details: redact(error.details) } : {})
      },
      requestId: request.id
    });
  });

  app.setNotFoundHandler((request, reply) => {
    reply.code(404).send({ ok: false, error: { code: 'NOT_FOUND', message: 'Resource not found' }, requestId: request.id });
  });
}
