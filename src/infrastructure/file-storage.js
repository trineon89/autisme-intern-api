import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';

export function safeFileName(name) {
  const base = path.basename(String(name || 'upload.bin'));
  return base.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/-+/g, '-').slice(0, 160) || 'upload.bin';
}

export async function saveUpload(part, directory) {
  await fs.mkdir(directory, { recursive: true });
  const originalName = safeFileName(part.filename);
  const extension = path.extname(originalName);
  const random = crypto.randomBytes(16).toString('hex');
  const fileName = `${Date.now()}-${random}${extension}`;
  const filePath = path.join(directory, fileName);
  const chunks = [];
  for await (const chunk of part.file) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  await fs.writeFile(filePath, buffer, { mode: 0o640 });
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  return {
    fileName,
    originalName,
    filePath,
    mimeType: part.mimetype || 'application/octet-stream',
    sizeBytes: buffer.length,
    sha256
  };
}
