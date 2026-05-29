import path from 'node:path';
import { ok, created, deleted } from '../../utils/http.js';
import { asApiDate, asInt, optionalInt, requireObject } from '../../utils/validation.js';
import { notFound } from '../../utils/errors.js';
import { writeSimplePdf } from '../../infrastructure/pdf.js';
import { deleteGeneratedReport, getGeneratedReport, insertGeneratedReport, listGeneratedReports, reportData } from './reports.repository.js';

function filtersFrom(value = {}) {
  return {
    from: value.from ? asApiDate(value.from, 'from') : null,
    until: value.until ? asApiDate(value.until, 'until') : null,
    personId: value.personId || value.person_id ? optionalInt(value.personId ?? value.person_id, 'personId') : null,
    placeId: value.placeId || value.place_id ? optionalInt(value.placeId ?? value.place_id, 'placeId') : null,
    mealChoiceId: value.mealChoiceId || value.meal_choice_id ? optionalInt(value.mealChoiceId ?? value.meal_choice_id, 'mealChoiceId') : null
  };
}

async function makePdf(request, type, filters) {
  const data = await reportData(request.server.db, filters);
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${type}-report-${stamp}.pdf`;
  const lines = [];
  for (const group of data.rows) {
    lines.push(`Service: ${group.group}`);
    for (const item of group.items) {
      lines.push(`${item.date} - ${item.person.lastName} ${item.person.firstName} - ${item.mealChoice?.labelLb || ''} - ${item.comment || ''}`);
    }
  }
  const storagePath = await writeSimplePdf({
    title: type === 'kitchen' ? 'Kitchen checklist' : 'Rapport général',
    lines,
    directory: request.server.config.reportDir,
    fileName: filename
  });
  return insertGeneratedReport(request.server.db, {
    type,
    filename,
    url: `/reports/generated/${filename}`,
    storagePath,
    mimeType: 'application/pdf',
    filtersJson: JSON.stringify(filters),
    createdBy: request.user?.id || null
  });
}

export default async function reportRoutes(app) {
  app.get('/data', async (request) => ok(await reportData(request.server.db, filtersFrom(request.query))));

  app.post('/pdf/general', async (request, reply) => created(reply, await makePdf(request, 'general', filtersFrom(requireObject(request.body)))));

  app.post('/pdf/kitchen', async (request, reply) => created(reply, await makePdf(request, 'kitchen', filtersFrom(requireObject(request.body)))));

  app.post('/email/kitchen', async (request, reply) => {
    const body = requireObject(request.body);
    const report = await makePdf(request, 'kitchen', filtersFrom(body));
    await request.server.db.query(
      `INSERT INTO email_jobs (type, recipient, subject, payload_json, status, created_by)
       VALUES ('kitchen_report', :recipient, :subject, :payload, 'queued', :createdBy)`,
      {
        recipient: body.recipient || null,
        subject: body.subject || 'Kitchen report',
        payload: JSON.stringify({ reportId: report.id, filters: filtersFrom(body) }),
        createdBy: request.user?.id || null
      }
    );
    reply.code(202);
    return ok({ queued: true, report, note: 'Email job queued. Configure/send jobs from your hosting scheduler or future worker.' });
  });

  app.get('/generated', async (request) => ok(await listGeneratedReports(request.server.db)));

  app.get('/generated/:filename', async (request, reply) => {
    const filename = path.basename(request.params.filename);
    const report = await request.server.db.one('SELECT * FROM generated_reports WHERE filename = :filename AND deleted_at IS NULL', { filename });
    if (!report) throw notFound('REPORT_NOT_FOUND', 'Generated report not found');
    return reply.type(report.mime_type).send(await import('node:fs/promises').then((fs) => fs.readFile(report.storage_path)));
  });

  app.delete('/generated/:id', async (request, reply) => {
    const id = asInt(request.params.id);
    if (!(await getGeneratedReport(request.server.db, id))) throw notFound('REPORT_NOT_FOUND', 'Generated report not found');
    await deleteGeneratedReport(request.server.db, id);
    return deleted(reply);
  });
}
