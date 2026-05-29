# Deployment on api2.autisme.lu

This project is intended for an Infomaniak Node.js site named `api2.autisme.lu`.

The important rule on Infomaniak is that the public site dashboard must route HTTP traffic to the same port used by the Node.js process. Infomaniak's Node.js configuration screen defines the execution folder, build command, start command, Node.js version, and listening port.

## Manager settings

In the Infomaniak Manager for the Node.js site:

| Setting | Value |
| --- | --- |
| Node.js version | `24.x` |
| Execution folder | the folder containing `package.json` |
| Build command | `npm install --omit=dev` |
| Start command | `npm start` |
| Listening port | use the port shown/assigned by the Manager |

If your GitHub ZIP or clone creates a nested folder, the execution folder must point to that nested app root, for example `./autisme-intern-api-main`, not merely to the parent folder.

## Server-only `.env`

Create `.env` on the hosting server. Do not add it to GitHub.

```env
APP_ENV=production
API_PUBLIC_URL=https://api2.autisme.lu
CORS_ORIGINS=https://namnam.autisme.lu

# Do not set PORT unless the Infomaniak Manager explicitly asks for a fixed port.
# Infomaniak normally passes the correct value through process.env.PORT.
LISTEN_HOST=0.0.0.0

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

Do not use `HOST=127.0.0.1` in production. The application defaults to `0.0.0.0` in production so Infomaniak's managed router/reverse proxy can reach it.

## Install

```bash
npm install --omit=dev
npm run migrate
ADMIN_EMAIL=admin@example.lu ADMIN_PASSWORD='...' npm run create-admin
npm start
```

## Runtime sanity check

Before restarting the public site, check the effective runtime config without printing secrets:

```bash
npm run runtime-info
```

Expected production output should include:

```json
{
  "listenHost": "0.0.0.0",
  "listenPort": 3000,
  "apiPublicUrl": "https://api2.autisme.lu"
}
```

The `listenPort` must match the port configured in the Infomaniak Node.js site settings.

## Public routing check

After restarting the application in the Infomaniak Node.js dashboard, these URLs should answer from this API:

```bash
curl -i https://api2.autisme.lu/
curl -i https://api2.autisme.lu/healthz
curl -i https://api2.autisme.lu/readyz
```

Expected:

- `/` returns the API endpoint overview HTML or JSON.
- `/healthz` returns `{"ok":true,"status":"healthy"}`.
- `/readyz` returns `200` if the database is reachable, or `503` if Node is reachable but the database is not ready.

If the browser still shows the Infomaniak maintenance page, the request is not reaching this Node process. Re-check the Manager configuration, especially execution folder, start command, listening port, domain assignment, SSL activation, and maintenance mode.

## Updating from GitHub

```bash
git pull
npm install --omit=dev
npm run migrate
# restart the Node application in the Infomaniak dashboard/process manager
```
