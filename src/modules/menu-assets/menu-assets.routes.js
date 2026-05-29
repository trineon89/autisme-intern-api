import { ok, created } from '../../utils/http.js';
import { optionalString } from '../../utils/validation.js';
import { saveUpload } from '../../infrastructure/file-storage.js';
import { listAssets, insertAsset } from './menu-assets.repository.js';

export default async function menuAssetRoutes(app) {
  app.get('/', async (request) => ok(await listAssets(request.server.db, { kind: request.query.kind, active: request.query.active !== 'false' })));

  app.post('/', async (request, reply) => {
    const parts = request.parts();
    let file = null;
    const fields = {};
    for await (const part of parts) {
      if (part.type === 'file' && !file) file = await saveUpload(part, request.server.config.uploadDir);
      if (part.type === 'field') fields[part.fieldname] = part.value;
    }
    if (!file) {
      reply.code(400);
      return { ok: false, error: { code: 'FILE_REQUIRED', message: 'A file field is required' } };
    }
    const asset = await insertAsset(request.server.db, {
      originalName: file.originalName,
      fileName: file.fileName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      sha256: file.sha256,
      url: `/uploads/${file.fileName}`,
      kind: optionalString(fields.kind, 'kind', 40) || 'image',
      altText: optionalString(fields.altText || fields.alt_text, 'altText', 255),
      metadata: JSON.stringify({ uploadedBy: request.user?.id || null })
    });
    return created(reply, asset);
  });
}
