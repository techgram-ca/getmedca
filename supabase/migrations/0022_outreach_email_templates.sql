-- ---------------------------------------------------------------------
-- 0022 · Outreach email templates, and one contact per address
--
-- Two things the tracking list was missing.
--
-- The emails are written by hand in a real mailbox, which is deliberate, but
-- retyping the same HTML with a different name and a different token each
-- time is how the wrong token ends up in the wrong pharmacy's email. A
-- template holds the prose once; the admin UI substitutes the per-pharmacy
-- parts and hands back finished HTML to paste.
--
-- And the same pharmacy could be added twice, which quietly splits one
-- pharmacy's history across two tokens and risks pitching them twice. The
-- address is the thing that identifies them, so that is what is unique.
-- ---------------------------------------------------------------------

create table if not exists public.outreach_email_templates (
  id uuid primary key default gen_random_uuid(),
  -- What it is for: the first pitch, the follow-up, the one for a chain.
  name text not null,
  subject text not null default '',
  -- HTML, pasted into a mail client. Placeholders are resolved by the app,
  -- never here: the link rules they depend on live in another table and a
  -- template written against a hardcoded origin would be wrong on staging.
  body text not null default '',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- At most one default. The app clears the others when one is promoted; this
-- is what makes that true rather than merely intended.
create unique index if not exists outreach_email_templates_one_default
  on public.outreach_email_templates (is_default)
  where is_default;

create or replace trigger outreach_email_templates_updated_at
  before update on public.outreach_email_templates
  for each row execute function public.set_updated_at();

alter table public.outreach_email_templates enable row level security;
drop policy if exists "outreach email templates: admin only" on public.outreach_email_templates;
create policy "outreach email templates: admin only" on public.outreach_email_templates
  for all using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- One contact per email address
--
-- Checked before the index is built so a database that already holds a
-- duplicate fails with the addresses named, rather than with a constraint
-- violation that says nothing about which rows to merge. Nothing is deleted
-- here: which of two rows to keep is a judgement about which token has
-- already been emailed, and that is not a migration's to make.
-- ---------------------------------------------------------------------

do $$
declare
  dupes text;
begin
  select string_agg(addr, ', ')
    into dupes
    from (
      select lower(trim(contact_email)) as addr
      from public.outreach_contacts
      where contact_email is not null and trim(contact_email) <> ''
      group by 1
      having count(*) > 1
    ) d;

  if dupes is not null then
    raise exception
      'Cannot make outreach contact emails unique: these addresses appear more than once (%). Merge or clear the duplicates in Tracking, keeping the row whose token you have already emailed, then run this again.',
      dupes;
  end if;
end $$;

-- Case- and whitespace-insensitive, because the same address gets typed two
-- ways. Partial, because a contact with no published address is normal.
create unique index if not exists outreach_contacts_email_unique
  on public.outreach_contacts (lower(trim(contact_email)))
  where contact_email is not null and trim(contact_email) <> '';
