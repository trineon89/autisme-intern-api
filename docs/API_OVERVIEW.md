# API overview

Base URL:

```text
https://api2.autisme.lu
```

Response shape for modern endpoints:

```json
{
  "ok": true,
  "data": {}
}
```

Error shape:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_DATE",
    "message": "date must use YYYY-MM-DD"
  },
  "requestId": "..."
}
```

## Authentication

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/login` | Authenticate with email/password and receive bearer token |
| POST | `/auth/logout` | Revoke current token |
| GET | `/auth/me` | Current authenticated user |
| POST | `/auth/refresh` | Rotate bearer token |

## Bootstrap

| Method | Path | Purpose |
|---|---|---|
| GET | `/namnam/bootstrap` | Load current user, settings, people, places, meal choices, reserved dates |

## People

| Method | Path | Purpose |
|---|---|---|
| GET | `/people` | List people. Filters: `active`, `meal_registration_enabled`, `is_encadrant`, `q`, `billing_category` |
| GET | `/people/{id}` | Get one person |
| POST | `/people` | Create a person |
| PATCH | `/people/{id}` | Update a person |
| PATCH | `/people/{id}/toggle` | Toggle `active`, `isEncadrant`, `hasBasePlan`, or `mealRegistrationEnabled` |
| PATCH | `/people/{id}/billing-category` | Update billing category |

## Places / services

| Method | Path | Purpose |
|---|---|---|
| GET | `/places` | List places/services |
| GET | `/places/{id}` | Get one place/service |
| POST | `/places` | Create a place/service |
| PATCH | `/places/{id}` | Update a place/service |

## Meal choices

| Method | Path | Purpose |
|---|---|---|
| GET | `/meal-choices` | List meal choices |
| GET | `/meal-choices/for-day?date=YYYY-MM-DD` | Choices and weekly menu context for a date |

Default choice codes seeded by migrations:

- `menu`
- `alternative_1`
- `alternative_2`
- `sandwich`
- `holiday`
- `none`

## Base plans

| Method | Path | Purpose |
|---|---|---|
| GET | `/base-plans?person_id={id}` | Base plan for one person |
| POST | `/base-plans` | Upsert base plan entries |
| GET | `/base-plans/by-service` | Base plans grouped by service/weekday |
| GET | `/base-plans/missing?date=YYYY-MM-DD` | People with base plan but no meal registration on a date |

## Meal registrations

| Method | Path | Purpose |
|---|---|---|
| GET | `/meal-registrations` | List registrations with filters |
| GET | `/meal-registrations/by-person-date?person_id={id}&date=YYYY-MM-DD` | Existing registration and warnings |
| POST | `/meal-registrations/single` | Upsert one registration |
| POST | `/meal-registrations/week` | Upsert one week for one person |
| POST | `/meal-registrations/return-from-leave` | Apply selected registrations after leave |

## Weekly menus

| Method | Path | Purpose |
|---|---|---|
| GET | `/weekly-menus?monday_date=YYYY-MM-DD` | Menu for a week |
| POST | `/weekly-menus` | Upsert menu for a Monday |
| GET | `/weekly-menus/latest` | Latest menu |
| GET | `/weekly-menus/latest/html` | Simple public HTML view |
| GET | `/weekly-menus/latest/mailchimp` | Mailchimp HTML if present, otherwise simple HTML |
| GET | `/weekly-menus/latest/pdf/{type}` | Redirect to exported PDF URL if present |

## Reports

| Method | Path | Purpose |
|---|---|---|
| GET | `/reports/data` | Filtered report data grouped by service |
| POST | `/reports/pdf/general` | Generate general PDF |
| POST | `/reports/pdf/kitchen` | Generate kitchen checklist PDF |
| POST | `/reports/email/kitchen` | Queue kitchen report email job |
| GET | `/reports/generated` | List generated reports |
| GET | `/reports/generated/{filename}` | Download generated report file |
| DELETE | `/reports/generated/{id}` | Soft-delete generated report |

## Settings, reserved dates, billing, import

See `docs/openapi.yaml` for the route list. The code is organized by module under `src/modules`.
