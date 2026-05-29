export function ok(data, meta = undefined) {
  return { ok: true, data, ...(meta ? { meta } : {}) };
}

export function created(reply, data) {
  reply.code(201);
  return ok(data);
}

export function deleted(reply) {
  reply.code(204);
  return undefined;
}

export function parsePaging(query = {}) {
  const limit = Math.min(Math.max(Number(query.limit || 100), 1), 500);
  const offset = Math.max(Number(query.offset || 0), 0);
  return { limit, offset };
}
