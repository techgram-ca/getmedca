# GetMed — pharmacy delivery marketplace

Monorepo for the four GetMed applications plus shared packages. Next.js (App Router) + TypeScript
everywhere, Supabase Postgres/PostGIS, Inngest for durable workflows, Mapbox for all location services.

| App | Package | Local port | Production host |
| --- | --- | --- | --- |
| Patient site | `apps/patient` | 3000 | getmed.ca |
| Pharmacy dashboard | `apps/pharmacy` | 3001 | pharmacy.getmed.ca |
| Admin portal | `apps/admin` | 3002 | admin.getmed.ca |
| Driver PWA | `apps/driver` | 3003 | driver.getmed.ca |

| Package | Purpose |
| --- | --- |
| `packages/core` | Domain layer: order state machine + service, notifications, OTP, Mapbox discovery, invoices, Inngest functions, admin PHI redaction, zod validation |
| `packages/db` | Typed Supabase clients (browser / server / service-role / proxy) and hand-authored `Database` types |
| `packages/ui` | Tailwind v4 design tokens and shared components (shadcn-style), the single Mapbox address autocomplete, Turnstile widget |
| `supabase/` | `fresh/` for a new database, `migrations/` for an existing one — see `supabase/README.md` |

## Architecture notes

- **State machine in code.** `packages/core/src/orders/state-machine.ts` is the only definition of allowed
  transitions and which actor may perform them. `service.ts` applies them with an optimistic
  `UPDATE … WHERE status = <expected>` so concurrent actors cannot double-transition. RLS enforces
  access control only.
- **Branding split.** Only `/p/[slug]` is pharmacy-owned: it renders the pharmacy's own header and
  footer, with GetMed reduced to a small "Powered by" credit. Every other patient page, including the
  order and consultation flows, lives in the `(site)` route group and carries GetMed's header and
  footer, because GetMed owns phone verification, delivery and support. The pharmacy still appears
  inside those pages as context via `OrderingFrom`.
- **Order source.** `orders.source` is `online` (patient submitted, OTP-verified, SLA timer) or `manual`
  (entered by the pharmacy from its dashboard via "Add order", one or many at a time). Manual orders
  start at `accepted` with no OTP and no SLA timer; the pharmacy attests consent. Both sources are
  filterable in the pharmacy and admin order lists.
- **Pharmacy write access ends at `picked_up`.** Enforced by the transition table, not the UI.
- **Escalation.** `rejected`, `cancelled`, `timed_out` and `failed` all set `escalated_at` and notify the
  admin. Pharmacies and drivers never re-contact the patient.
- **30-minute SLA.** `activateOrder` (after OTP) emits `order/created`; the Inngest function
  `order-sla-timer` waits for `order/responded` and otherwise calls `timeOutOrder`. Served from the
  patient app at `/api/inngest`.
- **Delivery pricing.** Four delivery types: Local, GTA and Extended carry a configured price;
  Custom is priced per order. Each pharmacy may override the platform defaults in
  `pharmacy_delivery_pricing`; without an override the default applies. The admin picks the type
  before assigning a driver, which resolves the price and snapshots it onto
  `orders.delivery_fee_charged`, so later pricing changes never reprice a quoted order. Invoices
  group delivered orders by type.
- **Admin PHI redaction.** Admin reads use the `orders_admin` view, which has no prescription /
  insurance / health-card / DOB / street-address columns, and `redactForAdmin()` exists for any
  code path that starts from a full row. Drivers use `orders_driver` (name, phone, address, notes only).
- **Discovery.** Geocode → PostGIS `pharmacies_near` (1.8× admin radius, straight line) → one batched
  Mapbox Matrix call (cached 5 min by rounded origin + pharmacy set) → filter by admin
  `search_radius_km` on real driving distance → sort.
- **Address autocomplete** is one component (`packages/ui/src/components/address-autocomplete.tsx`)
  using the Mapbox Search JS SDK with its session tokens, `country: CA` and an Ontario bbox.
- **Storage** buckets are all private; files are keyed by opaque UUIDs and served through short-lived
  signed URLs after an authorization check. No PHI in URLs or logs.

## Local setup

```bash
pnpm install
cp .env.example .env            # fill in keys (see below)
supabase start                  # local Postgres + Auth + Storage (Supabase CLI)
supabase db reset               # applies supabase/migrations + supabase/seed.sql
pnpm dev                        # all four apps via Turborepo, or pnpm dev:patient etc.
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest   # local Inngest dev server
```

Create the single admin user: sign up any account through the pharmacy app (or the Supabase
dashboard), then promote it:

```sql
update public.profiles set role = 'admin' where id = '<auth user id>';
delete from public.pharmacies where owner_user_id = '<auth user id>';
```

Drivers are created only from the admin portal (`/drivers/new`). Pharmacies self-register at
`pharmacy.getmed.ca/signup` and stay `pending` until approved in the admin portal.

Without Twilio/Resend keys, development mode logs sends to the console; set `OTP_DEV_LOG=1` to print
OTP codes locally. Production requires Twilio and Resend. Turnstile is optional: the bot check runs
only when both `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` are set, and OTP sends
fall back to the per-phone and per-IP rate limits when they are not.

## Environment

See `.env.example`. Supabase keys use the current format: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
(`sb_publishable_…`) and `SUPABASE_SECRET_KEY` (`sb_secret_…`); the legacy anon / service_role
variables still work as fallbacks. Required accounts: Supabase (**create the project in ca-central-1 / Montreal**),
Mapbox (one token), Cloudflare Turnstile, Twilio, Resend, Inngest, Sentry, Vercel Pro. Web Push for
the driver app needs VAPID keys (`npx web-push generate-vapid-keys`).

## Deployment (Vercel)

Create four Vercel projects pointing at this repo with root directories `apps/patient`,
`apps/pharmacy`, `apps/admin`, `apps/driver` (framework: Next.js, install command
`pnpm install`, build command `pnpm turbo run build --filter=@getmed/<app>`). Attach the same
environment variables to each. Point the Inngest app at `https://getmed.ca/api/inngest` and set the
Supabase Auth site URL / redirect URLs to the four hosts — the redirect list must include
`https://<pharmacy-host>/api/auth/callback`, which completes the pharmacy email confirmation. Regenerate DB types after schema changes
with `pnpm db:types`.

## Checks

```bash
pnpm typecheck   # tsc across packages and apps
pnpm test        # core unit tests (state machine, redaction, template validation)
pnpm build       # next build for all apps
```
