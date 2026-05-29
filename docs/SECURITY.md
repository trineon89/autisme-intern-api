# Security notes

## Secrets

- `.env` is ignored by Git.
- `.env.example` contains placeholders only.
- Do not commit database passwords, API tokens, SMTP passwords, or production bearer tokens.

## Authentication

- Passwords use Node native `crypto.scrypt` with per-password salt and `PASSWORD_PEPPER` from `.env`.
- API sessions use opaque random bearer tokens.
- Only SHA-256 token hashes are stored in `api_sessions`.
- Session expiry is configured with `SESSION_TTL_HOURS`.

## Browser access

CORS is restricted to `CORS_ORIGINS`. Keep this list short, usually:

```env
CORS_ORIGINS=https://namnam.autisme.lu
```

Do not expose `INTERNAL_API_TOKEN` or `LEGACY_API_KEY` to browser JavaScript.

## Logging

Fastify logger redacts:

- `Authorization`
- `Cookie`
- `X-API-Key`
- password/token fields

## Headers

The API adds:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `X-Frame-Options: DENY`
- `Permissions-Policy`
- strict `Content-Security-Policy`

## Database

- Use a dedicated DB user with only the required database permissions.
- Rotate credentials if a zip/archive containing `.env` is ever shared.
- Use HTTPS for all public traffic.

## File uploads

- Uploads are stored under `storage/uploads` or `storage/imports`.
- Filenames are sanitized.
- Size limit is `MAX_UPLOAD_BYTES`.
- Add malware scanning at the hosting layer if files come from untrusted users.
