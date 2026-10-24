-- ---------------------------------------------------------------------
-- 0024 · Which way a pitch went out
--
-- Outreach can now leave by two routes: Resend, like everything else, or an
-- ordinary mailbox over SMTP. The second exists because of a measured
-- difference — the same HTML from the same address reaches Gmail's Primary
-- tab from the Zoho mailbox and Promotions through Resend.
--
-- Recording the route makes that answerable later. Without it, "why did this
-- one land in Promotions" has no data behind it, which is how the question
-- got asked in the first place.
-- ---------------------------------------------------------------------

alter table public.outreach_sends
  add column if not exists transport text not null default 'resend'
    check (transport in ('resend', 'smtp'));

comment on column public.outreach_sends.transport is
  'How this message left: through Resend, or through a mailbox over SMTP.';
