-- Privileges for the PostgREST roles.
--
-- Nothing in 0001 or fresh/init.sql granted these. Supabase used to hand the
-- anon / authenticated roles access to every new table in public, so databases
-- built on older projects inherited them and the omission never showed. A
-- project created more recently does not, and every request through PostgREST
-- comes back "42501: permission denied for table ..." while the same query runs
-- fine in the SQL editor -- which connects as a superuser and skips both grants
-- and RLS.
--
-- Row level security is enabled on all 23 tables, so these grants decide who
-- may ask, not what comes back. They match what Supabase applies by default,
-- which is what every flow in the app was written and tested against.
--
-- Safe to re-run, and a no-op on a database that already has them.

grant usage on schema public to anon, authenticated, service_role;

grant all on all tables    in schema public to anon, authenticated, service_role;
grant all on all sequences in schema public to anon, authenticated, service_role;
grant all on all routines  in schema public to anon, authenticated, service_role;

-- Tables added by later migrations inherit the same grants.
alter default privileges in schema public grant all on tables    to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to anon, authenticated, service_role;
