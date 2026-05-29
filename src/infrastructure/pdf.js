import fs from 'node:fs/promises';
import path from 'node:path';

function escapePdfText(value) {
  return String(value ?? '').replace(/[\\()]/g, '\\$&').replace(/[\r\n]+/g, ' ');
}

export async function writeSimplePdf({ title, lines, directory, fileName }) {
  await fs.mkdir(directory, { recursive: true });
  const safeFileName = fileName.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const fullPath = path.join(directory, safeFileName);
  const contentLines = [`BT /F1 18 Tf 50 790 Td (${escapePdfText(title)}) Tj ET`];
  let y = 760;
  for (const line of lines.slice(0, 55)) {
    contentLines.push(`BT /F1 10 Tf 50 ${y} Td (${escapePdfText(line)}) Tj ET`);
    y -= 13;
  }
  const stream = contentLines.join('\n');
  const objects = [
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj',
    '4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj',
    `5 0 obj << /Length ${Buffer.byteLength(stream)} >> stream\n${stream}\nendstream endobj`
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${object}\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i < offsets.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer << /Root 1 0 R /Size ${objects.length + 1} >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  await fs.writeFile(fullPath, pdf, 'binary');
  return fullPath;
}
