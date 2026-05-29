# api2.autisme.lu

Modern Node.js v24 API for **NamNam / Autisme Inscription Menu** and the legacy `api.autisme.lu` domains.

This repository replaces the old PHP `x-menu`, `x-personal`, `x-service`, `x-plang`, `x-commande`, `x-kleeder`, and `x-translation` style API with a maintainable Node.js API. It also exposes the newer NamNam REST contract used by the frontend.

## What is included

- Node.js v24+ application server
- Fastify v5 HTTP layer
- MySQL/MariaDB connection via `mysql2`
- Manual `.env` loader; no database secrets are committed
- Auth endpoints with native `crypto.scrypt` password hashes and opaque bearer sessions
- REST endpoints for NamNam workflows
- Legacy compatibility routes such as `/personal/getPersonal`, `/menu/getMenuDay/:date`, `/service/getServicen`, `/commande/getCommanden`, and `/kleeder/getKleeder`
- SQL migrations for a clean database
- Simple PDF report generation without external PDF tools
- Markdown docs for Codex extension work
- OpenAPI overview in `docs/openapi.yaml`

## Requirements

- Node.js `v24+`
- MySQL or MariaDB database
- A reverse proxy / hosting setup capable of running a Node app, e.g. Infomaniak Node hosting
- HTTPS termination at the hosting / reverse proxy layer

No PHP, Composer, Docker, Laravel, or legacy Apache rewrite logic is required.

## First setup on `api2.autisme.lu`

Unzip or clone the project on the Node hosting.

```bash
npm install --omit=dev
cp .env.example .env
```

Edit `.env` **on the server only**. The `.env` file is ignored by Git and must not be committed.

Required database keys:

```env
DB_HOST=your-db-host
DB_PORT=3306
DB_NAME=your-db-name
DB_USER=your-db-user
DB_PASSWORD=your-db-password
```

Required security keys:

```env
PASSWORD_PEPPER=a-long-random-secret
INTERNAL_API_TOKEN=a-long-random-token
LEGACY_API_KEY=a-long-random-token-if-legacy-clients-use-x-api-key
```

Generate random values with something like:

```bash
node -e "console.log(crypto.randomBytes(48).toString('base64url'))"
```

Check the environment:

```bash
node scripts/check-env.js
```

Create the schema in the clean database:

```bash
npm run migrate
```

Create the first admin user:

```bash
ADMIN_EMAIL=admin@example.lu ADMIN_PASSWORD='choose-a-strong-password' ADMIN_NAME='Admin' npm run create-admin
```

Check the effective non-secret runtime settings:

```bash
npm run runtime-info
```

Start the API:

```bash
npm start
```

Or directly:

```bash
node src/server.js
```

For local development with a custom port:

```bash
PORT=3000 node src/server.js
```

## Production `.env` checklist

```env
APP_ENV=production
API_PUBLIC_URL=https://api2.autisme.lu
CORS_ORIGINS=https://namnam.autisme.lu
LISTEN_HOST=0.0.0.0
AUTH_REQUIRED=true
SESSION_TTL_HOURS=12
DB_SSL=false
```

On Infomaniak, prefer leaving `PORT` out of `.env` unless the Manager explicitly tells you to use a fixed port. The application reads `process.env.PORT`, which is how Infomaniak passes the configured listening port. Do not set `HOST=127.0.0.1` in production; use `LISTEN_HOST=0.0.0.0` or leave it unset so production defaults to `0.0.0.0`.

Keep these files out of Git:

- `.env`
- `.env.production`
- runtime uploads/reports/imports/logs
- `node_modules/`

## Main API areas

Modern NamNam endpoints:

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /namnam/bootstrap`
- `GET /people`
- `GET /places`
- `GET /meal-choices`
- `GET /base-plans`
- `POST /base-plans`
- `GET /meal-registrations`
- `POST /meal-registrations/week`
- `POST /meal-registrations/single`
- `GET /weekly-menus/latest`
- `POST /weekly-menus`
- `GET /reports/data`
- `POST /reports/pdf/general`
- `POST /reports/pdf/kitchen`
- `GET /billing/data`
- `GET /settings`
- `PATCH /settings`
- `GET /reserved-dates`
- `POST /import/preview`

Legacy-compatible domains:

- `/personal/getPersonal`
- `/personal/getPersoun/:id`
- `/service/getServicen`
- `/service/getService/:id`
- `/menu/getMenus`
- `/menu/getMenu/:idOrMondayDate`
- `/menu/getMenuDay/:date`
- `/plang/getMode/:id`
- `/plang/getContent`
- `/plang/updateUser`
- `/kleeder/...`
- `/commande/...`
- `/translation/...`

See:

- `docs/API_OVERVIEW.md`
- `docs/LEGACY_MAPPING.md`
- `docs/openapi.yaml`

## Authentication

Login returns an opaque bearer token:

```bash
curl -X POST https://api2.autisme.lu/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.lu","password":"..."}'
```

Use it on API calls:

```bash
curl https://api2.autisme.lu/people \
  -H 'Authorization: Bearer <token>'
```

Server-to-server calls may use `X-API-Key` with `INTERNAL_API_TOKEN` or `LEGACY_API_KEY`. Do not expose these values to browser JavaScript.

## Infomaniak public routing notes

If `npm start` logs that the app is listening but `https://api2.autisme.lu/` shows an Infomaniak maintenance/default page, the public request is not reaching this Node app. In the Infomaniak Node.js site dashboard, verify:

- Execution folder: the folder containing `package.json`.
- Build command: `npm install --omit=dev`.
- Start command: `npm start`.
- Listening port: the same port printed by `npm run runtime-info` / the app log.
- Domain assignment and SSL for `api2.autisme.lu`.
- Maintenance mode disabled.

See `docs/DEPLOYMENT_INFOMANIAK.md` and `docs/TROUBLESHOOTING_INFOMANIAK_NODE.md`.

## Reverse proxy notes

### Nginx example

```nginx
server {
  listen 443 ssl http2;
  server_name api2.autisme.lu;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

### Apache reverse proxy example

```apache
<VirtualHost *:443>
  ServerName api2.autisme.lu
  ProxyPreserveHost On
  ProxyPass / http://127.0.0.1:3000/
  ProxyPassReverse / http://127.0.0.1:3000/
  RequestHeader set X-Forwarded-Proto "https"
</VirtualHost>
```

## File permissions

The Node process needs write access to:

```text
storage/uploads
storage/reports
storage/imports
storage/logs
```

On Linux hosting:

```bash
chmod -R u+rwX storage
```

## Tests

Utility tests do not require a database:

```bash
npm run check
```

## Current implementation notes

- The old PHP API had multiple unrelated domains in one entrypoint. This repository keeps those domains but separates them into modules.
- The new clean database uses modern table names and explicit relations.
- The import confirmation endpoint currently records confirmation and is ready for project-specific row mapping extension.
- Kitchen email creates an `email_jobs` entry. A future SMTP worker can process that queue.
- PDF endpoints create simple valid PDFs using native Node code. They can be replaced later with a richer generator if desired.

## Recommended next Codex tasks

Start with `docs/CODEX_GUIDE.md`, then extend one module at a time. For example: improve Access import mapping, add SMTP job processing, or add richer PDF layouts.
