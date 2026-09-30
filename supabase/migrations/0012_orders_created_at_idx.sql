-- An index for the admin's date window.
--
-- orders_pharmacy_idx (pharmacy_id, created_at desc) serves the pharmacy
-- portal, whose every query is scoped to one pharmacy. The admin orders and
-- escalations lists filter on created_at across all pharmacies, and nothing
-- indexed that leading column, so each load was a sequential scan of orders
-- followed by a sort — work that grows with the whole table on a page that
-- only ever shows a few days.
--
-- Descending matches the "newest first" order the lists ask for, so the index
-- supplies the ordering as well as the range.

create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- The escalations list pairs the same window with escalated_at.
create index if not exists orders_escalated_created_idx
  on public.orders (escalated_at desc, created_at desc)
  where escalated_at is not null;
