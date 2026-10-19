-- Outreach tracking: who was emailed, whether they looked, and what came of it.
--
-- The emails themselves are written and sent by hand from a real mailbox, so
-- nothing here sends anything. A contact gets a token, the token becomes a
-- link, and this records what happens after someone clicks it.
--
-- Deliberately not a CRM. Two tables, one of which is an append-only log.
create table public.outreach_contacts (
  id uuid primary key default gen_random_uuid(),
  -- Short, random, unguessable. Appears in a URL, so it is not a UUID.
  token text not null unique,
  pharmacy_name text not null,
  -- The pharmacy's own publicly listed address. Business contact information,
  -- not a patient's, and nothing here is health information.
  contact_email text,
  city text,
  -- Where /i/<token> sends them. One of a small set the admin picks from.
  destination_path text not null default '/',

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
create index outreach_contacts_pharmacy_idx on public.outreach_contacts (pharmacy_id);

-- Every hit, not a boolean. A boolean cannot tell a mail scanner that fetched
-- the link once on delivery from a pharmacist who came back twice in a week,
-- and that difference is the entire value of the exercise.
create table public.outreach_visits (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.outreach_contacts (id) on delete cascade,
  kind text not null default 'visit' check (kind in ('visit', 'signup', 'unsubscribe')),
  path text,
  user_agent text,
  ip text,
  -- Decided at write time, from how soon after the send it arrived and what
  -- claimed to be asking. Stored rather than computed so the reasoning that
  -- produced it cannot drift away from the row it judged.
  likely_bot boolean not null default false,
  created_at timestamptz not null default now()
);
create index outreach_visits_contact_idx on public.outreach_visits (contact_id, created_at desc);

create trigger outreach_contacts_updated_at
  before update on public.outreach_contacts
  for each row execute function public.set_updated_at();

-- Every table in public is granted to anon, so without policies these would be
-- world-readable and world-writable through PostgREST — and this one holds a
-- list of every pharmacy being pitched. Admin tools hold the secret key and
-- bypass RLS; nobody else gets a policy at all.
alter table public.outreach_contacts enable row level security;
alter table public.outreach_visits enable row level security;

create policy "outreach contacts: admin only" on public.outreach_contacts
  for all using (public.is_admin()) with check (public.is_admin());
create policy "outreach visits: admin only" on public.outreach_visits
  for all using (public.is_admin()) with check (public.is_admin());
