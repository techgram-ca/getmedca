-- ---------------------------------------------------------------------
-- 0026 · Count tagged postal areas in the database
--
-- The pricing list said "none tagged" for a handful of pharmacies that were
-- tagged — the edit screen showed their cities, and they had been approved,
-- which is impossible without tags.
--
-- The list was fetching every row of `pharmacy_zone_areas` for every
-- pharmacy and counting them in JavaScript. PostgREST caps how many rows a
-- request may return, and `pharmacy_zone_areas` holds one row per pharmacy
-- per postal area: a few dozen pharmacies against 218 seeded areas runs to
-- thousands of rows. Past the cap the rest are simply not returned — no
-- error, no warning — so whichever pharmacies happened to sort last came
-- back with no rows and were reported as untagged. That is why it hit only
-- some of them, and why it would have spread as more pharmacies were
-- tagged.
--
-- Counting here instead returns one row per pharmacy rather than one per
-- postal area, which is three orders of magnitude below the cap and stays
-- there however many areas get tagged. The per-pharmacy screens were always
-- right because they ask about one pharmacy at a time.
-- ---------------------------------------------------------------------

create or replace view public.pharmacy_zone_area_counts
with (security_invoker = true)
as
select
  pharmacy_id,
  count(*)::int as tagged
from public.pharmacy_zone_areas
group by pharmacy_id;

comment on view public.pharmacy_zone_area_counts is
  'Tagged postal areas per pharmacy. Counted here so a list of pharmacies cannot be truncated by the PostgREST row cap.';
