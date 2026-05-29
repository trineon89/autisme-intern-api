# Deployment on api2.autisme.lu

This project is intended for a Node.js v24 hosting named `api2.autisme.lu`.

## Server-only `.env`

Create `.env` on the hosting server. Do not add it to GitHub.

```env
APP_ENV=production
HOST=127.0.0.1
PORT=3000
API_PUBLIC_URL=https://api2.autisme.lu
CORS_ORIGINS=https://namnam.autisme.lu

DB_HOST=your-host
DB_PORT=3306
DB_NAME=your-db
DB_USER=your-db-user
DB_PASSWORD=your-db-password

AUTH_REQUIRED=true
PASSWORD_PEPPER=generate-random-value
INTERNAL_API_TOKEN=generate-random-value
LEGACY_API_KEY=generate-random-value
```

## Install

```bash
npm install --omit=dev
npm run migrate
ADMIN_EMAIL=admin@example.lu ADMIN_PASSWORD='...' npm run create-admin
npm start
```

## Reverse proxy

Point HTTPS public traffic for `api2.autisme.lu` to the local Node port. The API itself trusts proxy headers and sets security headers.

## Updating from GitHub

```bash
git pull
npm install --omit=dev
npm run migrate
# restart Node process in the hosting UI / process manager
```

## Health checks

```bash
curl https://api2.autisme.lu/healthz
curl https://api2.autisme.lu/readyz
```

`/healthz` checks the process. `/readyz` checks database connectivity.
