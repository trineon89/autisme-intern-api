import { badRequest } from './errors.js';
import { isApiDate } from './date.js';

export function asInt(value, field = 'id') {
  const number = Number(value);
  if (!Number.isInteger(number)) throw badRequest('INVALID_INTEGER', `${field} must be an integer`);
  return number;
}

export function optionalInt(value, field = 'id') {
  if (value === undefined || value === null || value === '') return null;
  return asInt(value, field);
}

export function asString(value, field, max = 255) {
  if (value === undefined || value === null) throw badRequest('REQUIRED_FIELD', `${field} is required`);
  const str = String(value).trim();
  if (!str) throw badRequest('REQUIRED_FIELD', `${field} is required`);
  if (str.length > max) throw badRequest('FIELD_TOO_LONG', `${field} is too long`, { max });
  return str;
}

export function optionalString(value, field, max = 255) {
  if (value === undefined || value === null || value === '') return null;
  const str = String(value).trim();
  if (str.length > max) throw badRequest('FIELD_TOO_LONG', `${field} is too long`, { max });
  return str || null;
}

export function asBool(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on', 'jo', 'oui', 'active'].includes(value.toLowerCase());
  return false;
}

export function asApiDate(value, field = 'date') {
  if (!isApiDate(value)) throw badRequest('INVALID_DATE', `${field} must use YYYY-MM-DD`);
  return value;
}

export function optionalJson(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function requireObject(value, name = 'body') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw badRequest('INVALID_BODY', `${name} must be an object`);
  }
  return value;
}
