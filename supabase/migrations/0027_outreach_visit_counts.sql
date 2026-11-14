-- ---------------------------------------------------------------------
-- 0027 · Count outreach visits in the database
--
-- The same shape of bug 0026 fixed on the pricing list, found while fixing
-- it: the tracking list fetched every row of `outreach_visits` and counted
-- them per contact in JavaScript. One row per hit, scanners included, across
-- every contact ever pitched — so once the total passes the PostgREST row
-- cap, the contacts whose hits fall past it come back with none and are
-- shown as never having opened the link, which also drops their funnel stage
-- back to "Sent".
--
-- Not yet visible at a hundred-odd contacts, which is why it is being fixed
-- now rather than after a stage quietly goes backwards.
--
-- The numbers here have to agree with `summariseVisits` in
-- packages/core/src/outreach/index.ts, which is still what the per-contact
-- page uses for its destination breakdown:
--   · a bot hit counts towards neither the human total nor the days
--   · days are distinct UTC dates, matching that function's
--     `toISOString().slice(0, 10)` — the server has no notion of the admin's
--     timezone, and changing the bucketing here would silently restate every
--     "days visited" figure on the page
-- ---------------------------------------------------------------------

create or replace view public.outreach_visit_counts
with (security_invoker = true)
as
select
  contact_id,
  count(*) filter (where not likely_bot)::int as human_visits,
  count(*) filter (where likely_bot)::int as bot_visits,
  -- "A scanner hits once; a person comes back" — the headline the list
  -- leads with, so it counts separate days rather than hits.
  count(distinct ((created_at at time zone 'UTC')::date))
    filter (where not likely_bot)::int as human_days,
  min(created_at) filter (where not likely_bot) as first_human,
  max(created_at) filter (where not likely_bot) as last_human
from public.outreach_visits
group by contact_id;

comment on view public.outreach_visit_counts is
  'Visit totals per outreach contact. Counted here so a list of contacts cannot be truncated by the PostgREST row cap. Days are distinct UTC dates, matching summariseVisits().';
