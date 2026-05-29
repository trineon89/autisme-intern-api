export function parseCsv(text, delimiter = null) {
  const actualDelimiter = delimiter || (text.includes(';') ? ';' : ',');
  const rows = [];
  let current = '';
  let row = [];
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];
    if (char === '"') {
      if (quoted && next === '"') { current += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === actualDelimiter && !quoted) {
      row.push(current); current = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(current); current = '';
      if (row.some((cell) => cell.trim() !== '')) rows.push(row);
      row = [];
    } else current += char;
  }
  row.push(current);
  if (row.some((cell) => cell.trim() !== '')) rows.push(row);
  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index]?.trim() ?? ''])));
}
