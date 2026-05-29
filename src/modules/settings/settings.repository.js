import { parseJsonColumn } from '../../infrastructure/db.js';

export async function getSettings(db) {
  const rows = await db.query('SELECT `key`, value_json, updated_at FROM settings ORDER BY `key` ASC');
  const data = {};
  for (const row of rows) data[row.key] = parseJsonColumn(row.value_json, null);
  return data;
}

export async function patchSettings(db, patch) {
  for (const [key, value] of Object.entries(patch)) {
    await db.query(
      `INSERT INTO settings (
        \`key\`, value_json, updated_at
      ) VALUES (:keyName, :valueJson, UTC_TIMESTAMP())
      ON DUPLICATE KEY UPDATE value_json = VALUES(value_json), updated_at = UTC_TIMESTAMP()`,
      { keyName: key, valueJson: JSON.stringify(value) }
    );
  }
  return getSettings(db);
}
