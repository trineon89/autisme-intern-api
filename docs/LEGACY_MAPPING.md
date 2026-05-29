# Legacy API mapping

The old `api.autisme.lu` entrypoint used URLs like:

```text
/{handler}/{action}/{id}
```

or Apache rewrite rules that internally became:

```text
index.php?handler={handler}&action={action}&id={id}
```

This Node API keeps path-style compatibility for the common old routes and maps them to modern tables.

## Personal

| Old route | New implementation |
|---|---|
| `GET /personal/getPersonal` | `people` table, old `dt*` field names returned |
| `POST /personal/getPersonal` | Same, with old filters (`active`, `encadrant`, `inscription-repas`) |
| `GET /personal/getPersoun/:id` | One row from `people` |

## Service

| Old route | New implementation |
|---|---|
| `GET /service/getServicen` | `places` table, old `dtService` field returned |
| `GET /service/getService/:id` | One row from `places` |

## Menu

| Old route | New implementation |
|---|---|
| `GET /menu/getMenus` | `weekly_menus` mapped to the old `tblMenu2` shape |
| `GET /menu/getMenu/:idOrMondayDate` | Lookup by `weekly_menus.id` or `monday_date` |
| `GET /menu/getMenuDay/:date` | Finds Monday and returns menu/alternative labels for the date |
| `POST /menu/getMenuForUser` | Compatibility placeholder; new frontend should use `/meal-choices/for-day` and `/meal-registrations/by-person-date` |

## Plang

| Old route | New implementation |
|---|---|
| `GET /plang/getMode/:id` | Reads `settings.key = id_{id}` |
| `POST /plang/getContent` | Reads `work_plan_entries`, grouped similarly to old x-plang output |
| `PUT /plang/updateUser` | Updates `work_plan_entries` blocks |

## Kleeder

| Old route | New implementation |
|---|---|
| `GET /kleeder/getKleeder` | `clothing_items` |
| `GET /kleeder/getKleed/:id` | `clothing_items` |
| `GET /kleeder/getPersonalKleeder` | `clothing_assignments` joined with people/places/items |
| `GET /kleeder/getPersonalKleed/:id` | One clothing assignment |
| `GET /kleeder/getKleederForPersoun/:id` | Assignments for one person |
| `POST /kleeder/createKleed` | Create item |
| `POST /kleeder/createKleedForPersoun` | Create assignment |
| `PUT /kleeder/putKleed` | Update item |
| `PUT /kleeder/putKleedForPersoun` | Update assignment |

## Commande

The old `x-commande` file was large and mixed clients, products, stock, composition, orders, and production progress. The new module keeps route names but maps them to normalized `commande_*` tables.

Examples:

| Old route | New implementation |
|---|---|
| `/commande/getClients` | `commande_clients` + `commande_associations` |
| `/commande/getFournisseurs` | `commande_suppliers` |
| `/commande/getProduits` | `commande_products` |
| `/commande/getCommanden` | `commande_orders` |
| `/commande/getCommandeDetails/:id` | `commande_order_positions` + products |
| `/commande/insertCommande` | Inserts into `commande_orders` |
| `/commande/insertProduitCommande` | Inserts into `commande_order_positions` |
| `/commande/insertProduitComposition` | Upserts `commande_product_components` |

The very detailed legacy stock/progress formulas are simplified in the first Node version. They are isolated in `src/modules/commande/commande.routes.js` for later exact porting.

## Translation

Routes are kept under `/translation/*` and map to `translation_*` tables. The automatic enrichment functions are placeholders designed for later extension.
