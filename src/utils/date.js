const DAY_MS = 24 * 60 * 60 * 1000;

export function isApiDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function requireApiDate(value, field = 'date') {
  if (!isApiDate(value)) throw new Error(`${field} must use YYYY-MM-DD`);
  return value;
}

export function toApiDate(value) {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (isApiDate(value)) return value;
  if (typeof value === 'string') {
    const match = value.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return null;
}

export function parseUtcDate(apiDate) {
  if (!isApiDate(apiDate)) return null;
  const [year, month, day] = apiDate.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function addDays(apiDate, days) {
  const date = parseUtcDate(apiDate);
  if (!date) return null;
  return new Date(date.getTime() + Number(days) * DAY_MS).toISOString().slice(0, 10);
}

export function weekdayNumber(apiDate) {
  const date = parseUtcDate(apiDate);
  if (!date) return null;
  const day = date.getUTCDay();
  return day === 0 ? 7 : day;
}

export function mondayFor(apiDate) {
  const weekday = weekdayNumber(apiDate);
  if (!weekday) return null;
  return addDays(apiDate, 1 - weekday);
}

export function isMonday(apiDate) {
  return weekdayNumber(apiDate) === 1;
}

export function weekdaysForMonday(mondayDate) {
  const monday = mondayFor(mondayDate);
  if (!monday) return [];
  return [0, 1, 2, 3, 4].map((offset) => addDays(monday, offset));
}

export function monthBounds(month) {
  if (!/^\d{4}-\d{2}$/.test(month || '')) throw new Error('month must use YYYY-MM');
  const [year, rawMonth] = month.split('-').map(Number);
  const start = new Date(Date.UTC(year, rawMonth - 1, 1));
  const end = new Date(Date.UTC(year, rawMonth, 0));
  return { from: start.toISOString().slice(0, 10), until: end.toISOString().slice(0, 10) };
}

export function todayApiDate() {
  return new Date().toISOString().slice(0, 10);
}
