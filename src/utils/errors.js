export class ApiError extends Error {
  constructor(statusCode, code, message, details = null) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export function badRequest(code, message, details = null) {
  return new ApiError(400, code, message, details);
}

export function notFound(code = 'NOT_FOUND', message = 'Resource not found') {
  return new ApiError(404, code, message);
}

export function conflict(code, message, details = null) {
  return new ApiError(409, code, message, details);
}

export function unauthorized(message = 'Authentication required') {
  return new ApiError(401, 'UNAUTHORIZED', message);
}

export function forbidden(message = 'Not allowed') {
  return new ApiError(403, 'FORBIDDEN', message);
}

export function notImplemented(feature) {
  return new ApiError(501, 'NOT_IMPLEMENTED', `${feature} is not implemented yet`);
}
