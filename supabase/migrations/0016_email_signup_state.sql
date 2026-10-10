-- Tells the pharmacy signup form what it is looking at before it acts.
--
-- Supabase will not say whether an address is registered: a second signup for
-- a confirmed address comes back as success with a fake user, and for an
-- unconfirmed one it quietly re-sends the confirmation and hands back a user
-- whose confirmation_sent_at has already been overwritten by that send. So by
-- the time the response arrives, the one fact worth knowing — when the link
-- the pharmacy is still waiting on was actually sent — is gone.
--
-- This reads it beforehand, and nothing else: two timestamps for one address
-- the caller already typed. No id, no metadata, no password hash.
--
-- security definer because auth.users is not reachable any other way; pinned
-- search_path so the body cannot be redirected by a caller's path.
create or replace function public.email_signup_state(p_email text)
returns table (confirmed_at timestamptz, confirmation_sent_at timestamptz)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email_confirmed_at, u.confirmation_sent_at
  from auth.users u
  where lower(u.email) = lower(trim(p_email))
    and u.deleted_at is null
  limit 1;
$$;

-- Postgres grants EXECUTE on a new function to PUBLIC, which would make this
-- an endpoint for asking "is this pharmacy registered?" from the browser.
-- Only the server, holding the secret key, may ask.
revoke all on function public.email_signup_state(text) from public;
revoke all on function public.email_signup_state(text) from anon, authenticated;
grant execute on function public.email_signup_state(text) to service_role;
