# Database scripts

Two ways to get a database, depending on whether you already have one.

## Fresh setup — `fresh/`

`fresh/init.sql` is the schema up to `migrations/0015_launch_state.sql`, and
`fresh/seed.sql` is its matching reference data. Use these for a brand-new
project. Run the init first, then the seed:

```bash
psql "$DATABASE_URL" -f supabase/fresh/init.sql
psql "$DATABASE_URL" -f supabase/fresh/seed.sql
```

In the Supabase dashboard, paste each file into the SQL Editor and run it.

`fresh/` has not been kept up with `migrations/` since 0015: `0016`–`0020` are
not folded in, so a project built from `fresh/` still needs those applied
afterwards. Fold a change into `fresh/` as well as adding the migration, or
this gap grows.

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
| `migrations/0015_launch_state.sql` | Whether the patient site is open, and the message shown before it is |
| `migrations/0016_email_signup_state.sql` | `email_signup_state()`, so sign-up can tell a pending confirmation from a finished account |
| `migrations/0017_delivery_rate_cards.sql` | Admin-edited public delivery rate cards, one per city |
| `migrations/0018_outreach_tracking.sql` | Pitched pharmacies, and what happened after they clicked |
| `migrations/0019_drop_outreach_destination.sql` | Drops the per-contact destination 0018 added |
| `migrations/0020_outreach_link_rules.sql` | Admin-editable mapping from an invite link's slug to where it sends people |
| `migrations/0021_pharmacy_listed.sql` | `pharmacies.listed`: approved, but kept out of search with ordering disabled |
| `migrations/0022_outreach_email_templates.sql` | Reusable pitch-email templates, and one outreach contact per email address |
| `migrations/0023_outreach_sending.sql` | Sending pitch emails from admin: a send log, template files, a public media bucket |
| `migrations/0024_outreach_send_transport.sql` | Records whether a pitch left through Resend or a mailbox |
| `prod/outreach-contacts-mississauga.sql` | Loads 50 gathered Mississauga pharmacies into Tracking, same checks |
| `prod/outreach-contacts-vaughan.sql` | Loads 29 gathered Vaughan-area pharmacies into Tracking, skipping addresses already there |
| `prod/outreach-12.sql` | 0018–0020 as one repeatable script, for applying outreach tracking in one go |
| `seed.sql` | Reference data matching `migrations/0001_init.sql` (frozen) |

`migrations/0021_pharmacy_listed.sql` adds `pharmacies.listed`. `status` says where a pharmacy sits in
the approval lifecycle; whether patients can find it is a separate question, and answering both with a
fourth status value would have meant teaching every `status = 'approved'` check — the public view, the
pharmacists and services read policies, `pharmacy_is_approved`, the dashboard gate, the order and
consultation APIs — a new value, with the ones missed silently locking a pharmacy out of its own
account. `listed = false` leaves the pharmacy approved and working and only stops patients arriving:
`pharmacies_near` skips it, and `/p/[slug]` still renders in full but as a preview, with every button
disabled and the APIs refusing behind them. The migration sets it on the demo pharmacy, which exists to
be shown to prospects rather than ordered from. The default is true, so nothing already live changes.

`migrations/0022_outreach_email_templates.sql` adds `outreach_email_templates` and makes outreach
contact emails unique. A template holds the pitch HTML once; the admin UI substitutes the per-pharmacy
parts (`[pharmacy-name]`, `[pharmacy-city]`, and one `[<slug>-link]` per row in
`outreach_link_rules`) and hands back finished HTML to paste into a mail client — see
`packages/core/src/outreach/email.ts`. Link placeholders resolve to whole URLs rather than to a raw
token, so no template contains an origin and the same one works against staging. A partial unique
index allows exactly one default template. The contact email index is on
`lower(trim(contact_email))` and partial, since a contact with no published address is normal; the
migration refuses with the offending addresses named if a database already holds duplicates, rather
than deciding for itself which of two rows has already been emailed.

`migrations/0023_outreach_sending.sql` lets admin send the pitch itself rather than only producing
HTML to paste. `outreach_sends` records every attempt including the failures, because a send Resend
rejected otherwise looks identical to one never tried; it keeps `template_name` so the record stays
readable after a template is deleted. `outreach_template_files` holds what a template carries — an
`attachment` rides with the message, an `image` is linked from the body — in `outreach-media`, the
only public bucket in the project. It has to be public: a mail client fetches an inline image from
someone's inbox weeks later, with no session, so a signed URL would decay into a broken image.
Nothing patient-related goes near it and keys are random UUIDs. The migration also drops
`outreach_contacts.manual_signed_up_at` (a tick-box that let the list show a stage nothing backed
up — linking the pharmacy says the same thing and stays true) and `outreach_contacts.outcome` (a
dropdown nobody filled in; notes hold anything worth writing down). Sending needs
`OUTREACH_FROM_EMAIL` and `OUTREACH_REPLY_TO_EMAIL` — see `.env.example`.

## One change in one go — `prod/`

`prod/` holds a single consolidated script per feature, for applying one
feature to a live database without walking the numbered migrations one at a
time. Each is written to be repeatable, so running it on a database that is
part-way through the migrations it replaces lands in the same place as running
it on one that has none of them:

```bash
psql "$DATABASE_URL" -f supabase/prod/outreach-12.sql
```

`migrations/0024_outreach_send_transport.sql` adds `outreach_sends.transport`. Outreach can leave by
two routes — Resend, like everything else, or an ordinary mailbox over SMTP when the
`OUTREACH_SMTP_*` variables are set. The second exists because of a measured difference: the same HTML
from the same address reaches Gmail's Primary tab from the Zoho mailbox and Promotions through Resend.
Recording which route a message took is what makes a placement question answerable afterwards.
Transactional mail is unaffected and stays on Resend.

`prod/outreach-contacts-vaughan.sql` is data rather than schema: a hand-gathered list of Vaughan-area
pharmacies loaded into `outreach_contacts`. It inserts only addresses not already on the list, mints
each new row a token the same way `generateOutreachToken()` does, and prints three reports — what it
skipped and whether that contact has already been emailed, what went in, and what to look at before
sending: inserted names that resemble a name already there (a second branch and a typo'd address look
identical to a script), and any city with no published rate card, since `[rates-link]` would otherwise
be a live link to a 404 inside a pitch. Re-running it inserts nothing.

`prod/outreach-contacts-mississauga.sql` is the same load for 50 Mississauga pharmacies, names only —
the banner and street address are dropped on the way in, since the name opens the pitch. It prints the
same three reports, and the rate-card one earns its place here: there is no published Mississauga card
yet, so `[rates-link]` would 404 for all fifty until one exists.

`prod/outreach-12.sql` is `migrations/0018`, `0019` and `0020` clubbed
together — the outreach tables, their RLS policies and the four seeded invite
link rules. It never creates the `destination_path` column 0019 removes, but
drops it if an earlier 0018 run left it behind. The numbered migrations stay
where they are: they are the history a database created from `0001_init.sql`
follows, and `supabase db push` tracks them by name.

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

`migrations/0015_launch_state.sql` adds `platform_settings.launched_at` and `launch_message`. Null
`launched_at` is the pre-launch state, which is what every existing database arrives in — launching
is a deliberate act in admin settings, never something a migration does on someone's behalf. Before
launch the patient homepage is a coming-soon page with no navigation, transactional pages redirect
to it, and both `createOrder` and the consultations API refuse outright, so a direct link gets no
further than a disabled button would. Pharmacy pages stay visible with their actions disabled.

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
