# Codex guide

Use this guide when extending the API with Codex.

## Project rules

- Keep one business area per module under `src/modules/<domain>`.
- Keep SQL in repository/route modules, not scattered through utilities.
- Never hard-code credentials.
- Add new config keys to `.env.example` with placeholders.
- Add/adjust migrations for schema changes.
- Update `docs/openapi.yaml` and `docs/API_OVERVIEW.md` for new endpoints.
- Return modern responses as `{ ok: true, data }`.
- Throw `ApiError` or helpers from `src/utils/errors.js` for expected errors.
- Keep legacy response shapes only inside legacy modules.

## Useful entrypoints

- `src/server.js` starts the app.
- `src/app.js` registers all modules.
- `src/config/env.js` reads `.env`.
- `src/infrastructure/db.js` wraps MySQL.
- `src/middleware/auth.js` handles bearer/API-key auth.
- `migrations/001_initial_schema.sql` defines schema.

## Suggested extension tasks

### Improve Access/CSV import

Files:

- `src/modules/import/import.routes.js`
- `src/utils/csv.js`
- `migrations/001_initial_schema.sql`

Goal: map confirmed rows to `people`, `places`, `base_plans`, and `meal_registrations`.

### Add SMTP worker

Files:

- `src/modules/reports/reports.routes.js`
- create `src/workers/email-worker.js`
- add SMTP config keys to `.env.example`

Goal: process queued rows from `email_jobs`.

### Improve report PDFs

Files:

- `src/infrastructure/pdf.js`
- `src/modules/reports/reports.routes.js`

Goal: multi-page PDFs, better tables, logo/header/footer.

### Port more detailed x-commande stock logic

Files:

- `src/modules/commande/commande.routes.js`
- `migrations/001_initial_schema.sql`
- `docs/LEGACY_MAPPING.md`

Goal: match old weighted status/progress behavior exactly.

## Testing

Run utility tests:

```bash
npm run check
```

For endpoint tests, use a staging `.env` and `curl`/Postman. Do not commit staging secrets.
