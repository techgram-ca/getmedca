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
| `migrations/0005_consultation_pharmacist.sql` | Consultation price per topic, and the pharmacist a patient picked |
| `migrations/0006_failed_delivery_charges.sql` | Billing per delivery attempt, retryable failed deliveries, delivery note |
| `migrations/0007_delivery_zones.sql` | Five delivery zones priced by postal area |
| `migrations/0008_drop_distance_bands.sql` | Removes the distance-band fallback; untagged postal codes go to Zone 5 |
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

`migrations/0005_consultation_pharmacist.sql` adds `pharmacy_issues.price` (what a pharmacy charges
for a consultation topic; null means no fee) and, on `consultation_requests`, `pharmacist_id` and
`price_quoted`. The price is snapshotted at request time so a later change never reprices a request
already made — the same rule delivery pricing follows.

`migrations/0006_failed_delivery_charges.sql` moves billing out of `orders.delivery_fee_charged`
and into `order_charges`, one row per billable event, because a failed delivery can now be sent
back out and each trip bills separately. It also adds `platform_settings.failed_delivery_fee_percent`
(the share of the quoted fee a failed attempt bills, default 100), `orders.delivery_attempt`, and
`proof_of_delivery.note`. Existing delivered orders are backfilled into `order_charges` so past
invoices keep their totals.

`migrations/0007_delivery_zones.sql` replaces the three named delivery tiers with five zones. The
`delivery_type` enum becomes `delivery_zone` (`local→zone1`, `gta→zone2`, `extended→zone3`,
`custom→zone5`, with `zone4` new) — a fresh type is created and swapped rather than renaming values
in place, so the whole change lands in one transaction.

An order is priced when it arrives: a delivery postal code tagged in `pharmacy_zone_areas` takes its
zone's fixed price. Anything else is Zone 5, priced from `default_remote_per_km` against the stored
toll-free driving distance and quoted to the pharmacy as a span an admin confirms within.
`postal_areas` is the FSA-to-city reference table (seeded with 218 GTA and Hamilton postal areas),
and `pharmacy_delivery_config` holds per-pharmacy per-km rates.

`migrations/0008_drop_distance_bands.sql` removes the distance bands 0007 introduced, so there is no
middle path between a tagged postal code and Zone 5. Run it after 0007 — it is written to be safe
whether or not 0007 has already been applied.
