# Database scripts

Two ways to get a database, depending on whether you already have one.

## Fresh setup — `fresh/`

`fresh/init.sql` is the complete schema including every change to date, and
`fresh/seed.sql` is its matching reference data. Use these for a brand-new
project. Run the init first, then the seed:

```bash
psql "$DATABASE_URL" -f supabase/fresh/init.sql
psql "$DATABASE_URL" -f supabase/fresh/seed.sql
```

In the Supabase dashboard, paste each file into the SQL Editor and run it.

## Existing database — `migrations/`

`migrations/` is the incremental history. A database already created from
`migrations/0001_init.sql` only needs the later files applied in order:

```bash
supabase db push
```

`migrations/0001_init.sql` and `seed.sql` are frozen: they describe the
original schema and must not be edited, or databases created from them would
drift from their migration history. New schema changes go in a new numbered
migration, and the same change is folded into `fresh/`.

| File | Purpose |
| --- | --- |
| `fresh/init.sql` | Full current schema for a new project |
| `fresh/seed.sql` | Reference data matching `fresh/init.sql` |
| `migrations/0001_init.sql` | Original schema (frozen) |
| `migrations/0002_delivery_pricing.sql` | Per-pharmacy delivery pricing |
| `migrations/0003_delivery_distance.sql` | Stored driving distance per order, admin-visible delivery address |
| `migrations/0004_pharmacy_theme_color.sql` | Per-pharmacy theme colour for the public page |
| `seed.sql` | Reference data matching `migrations/0001_init.sql` (frozen) |

After any schema change, regenerate the TypeScript types with `pnpm db:types`.

`migrations/0003_delivery_distance.sql` adds `public.order_route_points`, a helper the app calls
through the service-role client to read an order's pharmacy and delivery coordinates for routing.
The actual route (distance, duration, toll status) is fetched from the Mapbox Directions API at
request time and cached on the order row — see `packages/core/src/orders/distance.ts`.

`migrations/0004_pharmacy_theme_color.sql` adds `pharmacies.theme_color` and appends it to
`pharmacies_public`. The column holds one `#rrggbb` value; the public page derives its whole
palette from it at render time — see `packages/core/src/theme/color.ts`. Null means the page
falls back to the GetMed teal.
