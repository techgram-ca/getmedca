-- ---------------------------------------------------------------------
-- 0028 · The address that does not work
--
-- Some pitches fail because the published address does not exist. Until now
-- that left no trace on the contact: `sent_at` stays null on a failed send,
-- so the row reads "Not sent" — identical to a pharmacy nobody has got to
-- yet. The one list worth having out of a failed batch is "whose address do
-- I need to find again", and it could not be produced.
--
-- `outreach_sends` already logs every attempt and its error, but it cannot
-- answer this on its own:
--   · most dead addresses never fail at send time. The relay accepts the
--     message and bounces it minutes later to the reply-to mailbox, which
--     nothing here can see — so the fact arrives by a human reading mail.
--   · a send can fail for reasons that have nothing to do with the address
--     (authentication, a dropped connection), and those must not condemn
--     every recipient in the batch.
--
-- Hence a field an admin can set and clear, which a clearly recipient-level
-- rejection also sets on its own. Clearing it is how you say "try this
-- again"; changing the address clears it too, because that is the fix.
-- ---------------------------------------------------------------------

alter table public.outreach_contacts
  add column if not exists email_failed_at timestamptz;

-- What the server said, or what the admin typed. Shown next to the mark so
-- "this one bounced" can be told apart from "this one was never tried".
alter table public.outreach_contacts
  add column if not exists email_failed_reason text;

-- A reason with nothing to be the reason for is a leftover from a mark that
-- was cleared, and would show up under an address that is fine.
alter table public.outreach_contacts
  drop constraint if exists outreach_contacts_email_failed_reason_check;
alter table public.outreach_contacts
  add constraint outreach_contacts_email_failed_reason_check
  check (email_failed_reason is null or email_failed_at is not null);

comment on column public.outreach_contacts.email_failed_at is
  'Set when the address is known not to work — by a recipient-level rejection at send time, or by hand after a bounce. Blocks sending until cleared; cleared automatically when the address is changed.';
comment on column public.outreach_contacts.email_failed_reason is
  'Why it is marked: the server''s response, or the admin''s note. Null unless email_failed_at is set.';
