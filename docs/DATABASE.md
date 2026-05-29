# Database guide

The project expects a clean MySQL/MariaDB database. Connection details are read from `.env` only.

## Initialize

```bash
cp .env.example .env
# edit DB_* values
npm run migrate
```

Migrations are plain SQL files in `migrations/` and are applied in lexical order.

## Core tables

| Table | Purpose |
|---|---|
| `users` | API users who can log in |
| `api_sessions` | Opaque bearer session tokens, stored as hashes |
| `people` | NamNam people/users/usagers/encadrants |
| `places` | Services/places |
| `meal_choices` | Menu, alternatives, sandwich, none, holiday |
| `weekly_menus` | Menu content for each Monday |
| `menu_assets` | Uploaded image/file metadata |
| `base_plans` | Default weekday plan per person |
| `meal_registrations` | Actual person + date + place + choice records |
| `reserved_dates` | Holidays/collective leave/reserved dates |
| `non_billable_dates` | Dates excluded from billing |
| `generated_reports` | Generated PDF metadata |
| `email_jobs` | Queued email jobs |
| `imports` | CSV/Access import preview/confirmation metadata |
| `work_plan_entries` | Legacy `x-plang` compatibility |

Legacy domains also have tables prefixed with:

- `clothing_` for `x-kleeder`
- `commande_` for `x-commande`
- `translation_` for `x-translation`

## Secrets rule

Never commit `.env`. The committed `.env.example` contains placeholders only.

## Data migration from old API

The old PHP API used tables such as `tblPersonal`, `tblService`, `tblMenu2`, `tblSchaffplang`, `tblCommande`, `tblProduit`, and `tblKleedung`.

Suggested import order from old data:

1. `tblService` → `places`
2. `tblPersonal` → `people`
3. `tblMenu2` → `weekly_menus`
4. `tblSchaffplang` → `work_plan_entries` or `base_plans`, depending on context
5. Old meal inscription table, if confirmed → `meal_registrations`
6. `tblKleedung`, `tblPersonalKleedung` → `clothing_items`, `clothing_assignments`
7. `tblClient`, `tblCommande`, `tblProduit` families → `commande_*`

The migration SQL intentionally does not contain old production credentials or direct remote database links.
