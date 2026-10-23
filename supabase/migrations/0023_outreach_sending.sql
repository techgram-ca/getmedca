-- ---------------------------------------------------------------------
-- 0023 · Sending outreach from the app
--
-- Until now the app produced the HTML and a person pasted it into a mail
-- client. That is fine for ten pharmacies and hopeless for a hundred, so
-- admin can now send directly through Resend.
--
-- Three things that need somewhere to live: a record of what was actually
-- sent, the files a template carries, and somewhere public to put the images
-- a mail client has to fetch.
--
-- Two columns go the other way. `manual_signed_up_at` let someone tick "they
-- signed up" without pointing at an account, so the list could show a stage
-- nothing backed up; linking the pharmacy says the same thing and keeps
-- itself up to date afterwards. `outcome` was a four-value dropdown nobody
-- filled in — notes already hold anything worth writing down.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- What was sent
--
-- One row per attempt, failures included. Without the failures a send that
-- Resend rejected looks identical to one that was never tried, and the first
-- thing anyone asks about outreach is "did that actually go out".
-- ---------------------------------------------------------------------
create table if not exists public.outreach_sends (
  id uuid primary key default gen_random_uuid(),
  contact_id uuid not null references public.outreach_contacts (id) on delete cascade,
  -- Kept if the template is later deleted: what was sent is a fact about the
  -- past and should not disappear because the prose was tidied up.
  template_id uuid references public.outreach_email_templates (id) on delete set null,
  template_name text,
  to_email text not null,
  subject text not null,
  status text not null default 'sent' check (status in ('sent', 'failed')),
  -- The provider's id, for tracing one message in the Resend dashboard.
  provider_message_id text,
  error text,
  attachment_count int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists outreach_sends_contact_idx
  on public.outreach_sends (contact_id, created_at desc);

-- ---------------------------------------------------------------------
-- Files a template carries
--
-- An attachment rides along with the message. An image is referenced by URL
-- from the body and fetched by the recipient's mail client, which is why its
-- bucket is public — a signed URL would expire and leave a broken image in an
-- email somebody keeps.
-- ---------------------------------------------------------------------
create table if not exists public.outreach_template_files (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.outreach_email_templates (id) on delete cascade,
  kind text not null check (kind in ('attachment', 'image')),
  -- Object key in the outreach-media bucket.
  path text not null,
  filename text not null,
  content_type text not null,
  size_bytes int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists outreach_template_files_template_idx
  on public.outreach_template_files (template_id, kind, created_at);

alter table public.outreach_sends enable row level security;
alter table public.outreach_template_files enable row level security;
drop policy if exists "outreach sends: admin only" on public.outreach_sends;
drop policy if exists "outreach template files: admin only" on public.outreach_template_files;
create policy "outreach sends: admin only" on public.outreach_sends
  for all using (public.is_admin()) with check (public.is_admin());
create policy "outreach template files: admin only" on public.outreach_template_files
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- The bucket
--
-- Public, unlike every other bucket here, and deliberately so: these are
-- marketing images that have to load inside somebody else's inbox. Nothing
-- patient-related goes near it. Keys are random, so the URL is not guessable
-- from a pharmacy's name, but anyone holding one can read the object — which
-- is the point.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'outreach-media', 'outreach-media', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "outreach media: admin writes" on storage.objects;
drop policy if exists "outreach media: public reads" on storage.objects;

create policy "outreach media: admin writes" on storage.objects
  for all
  using (bucket_id = 'outreach-media' and public.is_admin())
  with check (bucket_id = 'outreach-media' and public.is_admin());

-- Reading is what makes an inline image work in a mail client, which arrives
-- with no session at all.
create policy "outreach media: public reads" on storage.objects
  for select using (bucket_id = 'outreach-media');

-- ---------------------------------------------------------------------
-- Two columns that stopped earning their place
-- ---------------------------------------------------------------------
alter table public.outreach_contacts drop column if exists manual_signed_up_at;
alter table public.outreach_contacts drop column if exists outcome;
