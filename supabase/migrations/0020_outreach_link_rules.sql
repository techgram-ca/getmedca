-- Where each invite-link suffix sends people, editable without a deploy.
--
-- `/i/<token>` follows the rule with an empty slug, `/i/<token>/signup` the
-- one slugged "signup", and so on. A rule that appends takes whatever follows
-- its slug and puts it on the end, so one "rates" rule covers every rate card
-- that will ever be published.
--
-- `site` is two fixed values, not a URL. The origin is read from the
-- environment at redirect time and never from this table: a row that could
-- name its own host would turn every invite link into an open redirect on a
-- domain pharmacies are being asked to trust, and a forwarded pitch email
-- hands a working token to anyone.
create table if not exists public.outreach_link_rules (
  id uuid primary key default gen_random_uuid(),
  -- The bit after the token. Empty string is the bare /i/<token>.
  slug text not null unique,
  site text not null default 'pharmacy' check (site in ('pharmacy', 'patient')),
  -- Always rooted, never a host. Checked again in the app before use.
  path text not null check (path like '/%' and path not like '%//%' and path not like '%..%' and path !~ ':'),
  -- Whether segments after the slug are appended. Off by default, so a
  -- mistyped /signup/nonsense lands on the sign-up form rather than a 404.
  appends_rest boolean not null default false,
  label text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger outreach_link_rules_updated_at
  before update on public.outreach_link_rules
  for each row execute function public.set_updated_at();

-- The four that were hard-coded, so nothing already in an inbox breaks.
insert into public.outreach_link_rules (slug, site, path, appends_rest, label, sort_order) values
  ('',       'pharmacy', '/',                false, 'The pitch (pharmacy home)', 0),
  ('signup', 'pharmacy', '/signup',          false, 'Sign-up form',              1),
  ('rates',  'pharmacy', '/delivery-rates',  true,  'Delivery rate card',        2),
  ('demo',   'patient',  '/p/demo-pharmacy', false, 'Demo pharmacy page',        3)
on conflict (slug) do nothing;

-- Readable by the redirect handler, which holds the secret key; writable only
-- by an admin. Without policies the grants on public would leave it open.
alter table public.outreach_link_rules enable row level security;
drop policy if exists "outreach link rules: admin only" on public.outreach_link_rules;
create policy "outreach link rules: admin only" on public.outreach_link_rules
  for all using (public.is_admin()) with check (public.is_admin());
