-- ---------------------------------------------------------------------
-- Outreach tracking — migrations 0018, 0019 and 0020 as one script.
--
-- Run this once on a project that has none of it. Safe to run on one that
-- has some of it: every statement is written to be repeatable, so a staging
-- database part-way through the three separate migrations lands in the same
-- place as a production database starting from nothing.
--
-- What it adds: who was emailed a pitch, what happened after they clicked,
-- and where each invite link sends people. Nothing here sends anything —
-- the emails are written and sent by hand from a real mailbox.
-- ---------------------------------------------------------------------


-- ---------------------------------------------------------------------
-- Contacts
--
-- One row per pharmacy pitched. Deliberately not a CRM.
-- ---------------------------------------------------------------------
create table if not exists public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  -- Short, random, unguessable. Appears in a URL, so it is not a UUID.
  token text not null unique,
  pharmacy_name text not null,
  -- The pharmacy's own publicly listed address. Business contact information,
  -- not a patient's, and nothing here is health information.
  contact_email text,
  city text,

  -- Set by hand, because sending happens in a mail client this cannot see.
  -- The bot filter needs it: a hit seconds after a send is a scanner.
  sent_at timestamptz,

  -- Attribution. Set automatically when someone signs up carrying the token,
  -- or by hand for a pharmacy that signed up before any of this existed.
  pharmacy_id uuid references public.pharmacies (id) on delete set null,
  -- The weaker claim: "I know they signed up, I cannot point at the row."
  -- Kept apart from pharmacy_id so the admin list can say which it is.
  manual_signed_up_at timestamptz,

  -- The human judgement a database cannot infer.
  outcome text not null default 'new'
    check (outcome in ('new', 'contacted', 'replied', 'not_interested')),
  notes text,

  -- CASL: a working unsubscribe in every commercial message, honoured.
  unsubscribed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists outreach_contacts_pharmacy_idx on public.outreach_contacts (pharmacy_id);

-- Was migration 0019. Where a link goes is decided by the link now, not by
-- the contact, so a database that ran 0018 on its own still carries a column
-- nothing reads. Left in place it would read, to whoever finds it next, as
-- something that still decides where people land. A fresh run never has it.
alter table public.outreach_contacts drop column if exists destination_path;


-- ---------------------------------------------------------------------
-- Visits
--
-- Every hit, not a boolean. A boolean cannot tell a mail scanner that
-- fetched the link once on delivery from a pharmacist who came back twice in
-- a week, and that difference is the entire value of the exercise.
-- ---------------------------------------------------------------------
create table if not exists public.outreach_visits (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.outreach_contacts (id) on delete cascade,
  kind text not null default 'visit' check (kind in ('visit', 'signup', 'unsubscribe')),
  -- The destination keyword, not a URL: it is what the admin list reads back,
  -- and it stays meaningful if a page ever moves.
  path text,
  user_agent text,
  ip text,
  -- Decided at write time, from how soon after the send it arrived and what
  -- claimed to be asking. Stored rather than computed so the reasoning that
  -- produced it cannot drift away from the row it judged.
  likely_bot boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists outreach_visits_contact_idx on public.outreach_visits (contact_id, created_at desc);


-- ---------------------------------------------------------------------
-- Link destinations (was migration 0020)
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
-- ---------------------------------------------------------------------
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

-- The four the application expects to find. Adding more is an admin screen.
insert into public.outreach_link_rules (slug, site, path, appends_rest, label, sort_order) values
  ('',       'pharmacy', '/',                false, 'The pitch (pharmacy home)', 0),
  ('signup', 'pharmacy', '/signup',          false, 'Sign-up form',              1),
  ('rates',  'pharmacy', '/delivery-rates',  true,  'Delivery rate card',        2),
  ('demo',   'patient',  '/p/demo-pharmacy', false, 'Demo pharmacy page',        3)
on conflict (slug) do nothing;


-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------
create or replace trigger outreach_contacts_updated_at
  before update on public.outreach_contacts
  for each row execute function public.set_updated_at();

create or replace trigger outreach_link_rules_updated_at
  before update on public.outreach_link_rules
  for each row execute function public.set_updated_at();


-- ---------------------------------------------------------------------
-- Row level security
--
-- Not optional. Every table in public is granted to anon, so without a
-- policy set these would be world-readable and world-writable through
-- PostgREST — and the first of them is a list of every pharmacy being
-- pitched. Admin tools hold the secret key and bypass RLS; nobody else gets
-- a policy at all. The redirect handler also holds the secret key.
-- ---------------------------------------------------------------------
alter table public.outreach_contacts   enable row level security;
alter table public.outreach_visits     enable row level security;
alter table public.outreach_link_rules enable row level security;

drop policy if exists "outreach contacts: admin only"   on public.outreach_contacts;
drop policy if exists "outreach visits: admin only"     on public.outreach_visits;
drop policy if exists "outreach link rules: admin only" on public.outreach_link_rules;

create policy "outreach contacts: admin only" on public.outreach_contacts
  for all using (public.is_admin()) with check (public.is_admin());
create policy "outreach visits: admin only" on public.outreach_visits
  for all using (public.is_admin()) with check (public.is_admin());
create policy "outreach link rules: admin only" on public.outreach_link_rules
  for all using (public.is_admin()) with check (public.is_admin());
