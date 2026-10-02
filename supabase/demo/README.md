# Demo data

Not migrations. Nothing here runs automatically and nothing belongs in
production — these are for the dev/QA database, to show people what the
product looks like with content in it.

| File | What it does |
| --- | --- |
| `bolton-pharmacies.sql` | Nine Bolton / Caledon East pharmacies with public pages, staff, services and consultation topics |
| `remove-bolton-pharmacies.sql` | Deletes them again |

## Running them

Paste into the Supabase SQL editor of the **dev** project, or:

```bash
psql "$DATABASE_URL" -f supabase/demo/bolton-pharmacies.sql
```

Both are safe to re-run. The pharmacies upsert on their slug and the child
rows are rebuilt rather than duplicated, so running it twice leaves the same
nine pharmacies with the same counts.

## What is real and what is not

The **business names are real**. Everything else is invented: addresses,
phone numbers, licence numbers, hours, staff, prices and the writing. Phone
numbers use the 555 range reserved for fiction so nobody demoing this can
call a real pharmacy by accident, and emails use the reserved `.invalid`
domain for the same reason.

Replace that content before putting any of it in front of the pharmacies
themselves — a page that says the wrong opening hours over a real name is
worse than an obviously empty one.

## No accounts

`owner_user_id` is left null, which the schema allows. The pages exist and
are publicly reachable at `/p/<slug>`; nobody can sign in as them, and no
auth users are created.

## Images

`logo_path` and `cover_path` are null on purpose. The app already falls back
to the pharmacy's initials on a brand-tinted circle (`Avatar` in
`packages/ui`) and to `/images/pharmacy.png` for the storefront, so the pages
look finished with nothing uploaded to storage. Each pharmacy gets a
different `theme_color`, so the set also shows the per-pharmacy theming.
