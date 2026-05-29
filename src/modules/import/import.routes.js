import { ok, created } from '../../utils/http.js';
import { saveUpload } from '../../infrastructure/file-storage.js';
import { parseCsv } from '../../utils/csv.js';

async function readImportParts(request) {
  const parts = request.parts();
  let upload = null;
  const fields = {};
  for await (const part of parts) {
    if (part.type === 'file' && !upload) upload = await saveUpload(part, request.server.config.importDir);
    if (part.type === 'field') fields[part.fieldname] = part.value;
  }
  return { upload, fields };
}

export default async function importRoutes(app) {
  app.post('/preview', async (request) => {
    const { upload, fields } = await readImportParts(request);
    if (!upload) return { ok: false, error: { code: 'FILE_REQUIRED', message: 'A CSV file is required' } };
    const fs = await import('node:fs/promises');
    const text = await fs.readFile(upload.filePath, 'utf8');
    const rows = parseCsv(text, fields.delimiter || null);
    const preview = rows.slice(0, 50);
    const unresolved = preview.filter((row) => !Object.keys(row).length);
    const id = await request.server.db.insert(
      `INSERT INTO imports (type, filename, original_name, status, preview_json, created_by)
       VALUES (:type, :filename, :originalName, 'previewed', :preview, :createdBy)`,
      {
        type: fields.type || 'csv',
        filename: upload.fileName,
        originalName: upload.originalName,
        preview: JSON.stringify({ rows: preview, totalRows: rows.length }),
        createdBy: request.user?.id || null
      }
    );
    return ok({ importId: id, totalRows: rows.length, preview, unresolvedRows: unresolved });
  });

  app.post('/confirm', async (request, reply) => {
    const body = request.body || {};
    const importId = Number(body.importId ?? body.import_id);
    await request.server.db.query('UPDATE imports SET status = :status, updated_at = UTC_TIMESTAMP() WHERE id = :id', { id: importId, status: 'confirmed' });
    return created(reply, { importId, inserted: 0, updated: 0, skipped: 0, errors: 0, note: 'Import confirmed. Domain-specific import mapping should be extended in src/modules/import.' });
  });
}
