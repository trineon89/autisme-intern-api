# Troubleshooting Infomaniak Node.js public routing

Use this when the execution console says the API is listening, but the public URL shows an Infomaniak maintenance page or another default page.

## What the log means

A log like this only proves that Node started inside the hosting environment:

```text
Server listening at http://127.0.0.1:3000
api2.autisme.lu listening
```

It does not prove that `https://api2.autisme.lu` is routed to that process.

This API has a public root route. If public traffic reaches the app, `https://api2.autisme.lu/` displays the API endpoint overview. If you see an Infomaniak maintenance page instead, the request is being handled before it reaches Node.

## Fix checklist

1. Open the Infomaniak Manager for the `api2.autisme.lu` Node.js site.
2. Confirm the application is the Node.js site assigned to the `api2.autisme.lu` subdomain.
3. Confirm maintenance mode is disabled for this site/domain.
4. Confirm the execution folder is the folder that contains `package.json`.
5. Confirm the build command is `npm install --omit=dev` or blank if dependencies are already installed.
6. Confirm the start command is `npm start`.
7. Confirm the listening port in the Manager matches the port used by the app.
8. Remove `HOST=127.0.0.1` from `.env`, or set `LISTEN_HOST=0.0.0.0`.
9. Prefer leaving `PORT` out of `.env`; let the Manager provide it. If the Manager is configured to port `3000`, then `PORT=3000` is acceptable.
10. Restart the app from the Infomaniak dashboard, not only from an SSH terminal.

## Commands to run on the server

From the project root:

```bash
npm run runtime-info
curl -i http://127.0.0.1:${PORT:-3000}/healthz
```

The first command prints non-secret runtime settings. The second command proves that the process answers locally.

Then test the public URL from your machine:

```bash
curl -i https://api2.autisme.lu/healthz
```

Interpretation:

| Result | Meaning |
| --- | --- |
| `200` with JSON `healthy` | Public routing reaches the Node API. |
| `503` on `/readyz` only | Public routing works, but the database connection/config needs checking. |
| Infomaniak maintenance HTML | Public routing is still not connected to the Node app. |
| 404/default page not from this API | The domain points to the wrong site/document root. |

## Expected production log after this patch

```text
api2.autisme.lu listening { host: "0.0.0.0", port: <manager-port> }
```

The public root page also says: `If this page appears, traffic is reaching the Fastify application.`
