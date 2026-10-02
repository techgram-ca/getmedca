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
| `migrations/0009_pharmacy_point.sql` | `pharmacy_point()`, for quoting an address before an order exists |
| `migrations/0010_order_sla_minutes.sql` | Snapshots the response window on each order so the countdown follows the admin's setting |
| `migrations/0011_role_grants.sql` | Grants the PostgREST roles access to `public`; newer Supabase projects do not do this automatically |
| `migrations/0012_orders_created_at_idx.sql` | Indexes `orders.created_at` for the admin lists, which filter by date across all pharmacies |
| `migrations/0013_handling_requirements.sql` | Refrigeration, narcotics and cash-to-collect on an order, and the refrigeration fee that bills |
| `migrations/0014_pharmacy_slug_postal_code.sql` | Rebuilds public pharmacy slugs as `name-postalcode`, so one chain can have many branches |
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

`migrations/0009_pharmacy_point.sql` adds `public.pharmacy_point`, which returns a pharmacy's
coordinates through `st_x`/`st_y`. The manual order form quotes a delivery as soon as the address is
picked, which needs the driving distance from the pharmacy before any order row exists for
`order_route_points` to read.

`migrations/0014_pharmacy_slug_postal_code.sql` rebuilds `pharmacies.slug` as the name followed by
the postal code. A chain repeats its name in every city, so a name-only slug collided and the second
branch to submit got four characters of its UUID appended — unique, but meaningless to a patient.
New slugs come from `pharmacySlug()` in `packages/core/src/format.ts`, set once at signup and never
regenerated, since a public URL that moves when an address is edited is a dead link everywhere it
was shared. The migration and the TypeScript were diffed against the same nine inputs and agree
exactly; they can only differ on accented names, which the app folds to the base letter and SQL
replaces with a separator. A pharmacy with no usable postal code keeps a name-only slug, and any
rebuild that would collide is skipped rather than renamed.

`migrations/0013_handling_requirements.sql` records what a delivery needs handled —
`requires_refrigeration`, `has_narcotics` and `cash_to_collect` on `orders` — captured when the
pharmacy marks the order ready, or on the manual order form. Refrigeration costs money to carry, so
it bills: `platform_settings.default_refrigeration_fee` with a per-pharmacy override in
`pharmacy_delivery_config.refrigeration_fee`, charged through a new `refrigeration` value on the
`order_charge_kind` enum rather than folded into the delivery price, so an invoice itemises it and a
re-delivery cannot double it. A fee of zero still asks the question and still tells the driver; it
just records no charge. All three columns are appended to `orders_driver` and `orders_admin`.

`migrations/0012_orders_created_at_idx.sql` indexes `orders (created_at desc)`. `orders_pharmacy_idx`
leads with `pharmacy_id`, so it serves the pharmacy portal but not the admin orders and escalations
lists, which filter on `created_at` across every pharmacy — those were a sequential scan of `orders`
plus a sort on every load, on pages that only ever show a few days.

`migrations/0011_role_grants.sql` grants `anon`, `authenticated` and `service_role` access to the
`public` schema. Neither `0001_init.sql` nor `fresh/init.sql` did this, because Supabase used to
apply those grants to every new table itself — so a database built on an older project inherited
them and the gap never showed. A project created more recently does not, and every PostgREST
request fails with `42501: permission denied for table …` while the SQL editor keeps working,
since it connects as a superuser and skips both grants and RLS. RLS is enabled on all 23 tables,
so the grants govern who may ask, not what comes back.

`migrations/0010_order_sla_minutes.sql` adds `orders.sla_minutes`, written when the order is
activated. The SLA timer is scheduled on Inngest at that moment, so an order already waiting keeps
the window it started with — reading the current `platform_settings.sla_minutes` at render time
would show a deadline the timer will not honour. It also rewrites the notification templates that
hardcoded "30 minutes" to use a `{slaMinutes}` placeholder, matching on the exact original text so
anything an admin has edited is left alone.
