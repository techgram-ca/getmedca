-- What a delivery needs handled, captured when the pharmacy marks it ready.
--
-- Three things the driver has to know before collecting, and that nothing in
-- the schema could record: whether the bag has to stay cold, whether it holds
-- a controlled substance, and whether money is being collected at the door.
--
-- Refrigeration costs money to carry, so it bills. The other two change how
-- the delivery is handled, not what it costs.

alter table public.orders
  add column if not exists requires_refrigeration boolean not null default false,
  add column if not exists has_narcotics boolean not null default false,
  add column if not exists cash_to_collect numeric(10,2)
    constraint orders_cash_to_collect_non_negative check (cash_to_collect is null or cash_to_collect >= 0);

comment on column public.orders.requires_refrigeration is
  'Cold-chain delivery. Bills the refrigeration fee in effect for the pharmacy.';
comment on column public.orders.cash_to_collect is
  'Amount the driver collects from the patient. Null when nothing is owed.';

-- The fee: a platform default, overridable per pharmacy, exactly like the
-- per-km rate it sits beside. Zero means the handling is still recorded and
-- still reaches the driver — it just does not bill, and the pharmacy is asked
-- the question without being quoted a price.
alter table public.platform_settings
  add column if not exists default_refrigeration_fee numeric(10,2) not null default 0
    constraint platform_settings_refrigeration_fee_non_negative check (default_refrigeration_fee >= 0);

alter table public.pharmacy_delivery_config
  add column if not exists refrigeration_fee numeric(10,2)
    constraint pharmacy_delivery_config_refrigeration_non_negative check (refrigeration_fee is null or refrigeration_fee >= 0);

-- Billed on its own line rather than folded into the delivery price, so an
-- invoice says what the pharmacy paid for and a re-delivery does not silently
-- double it. order_charges is already unique on (order_id, kind, attempt).
alter type public.order_charge_kind add value if not exists 'refrigeration';

-- The driver has to see all three before collecting: what to carry cold, what
-- needs a signature for a controlled substance, and what to collect at the
-- door. Appended, never reordered — create or replace view cannot rename or
-- move a column, only add to the end.
create or replace view public.orders_driver
with (security_invoker = true)
as
select
  o.id, o.pharmacy_id, o.order_type, o.status, o.patient_name, o.patient_phone,
  o.delivery_address_line, o.delivery_city, o.delivery_postal_code, o.delivery_notes,
  st_y(o.delivery_location::geometry) as delivery_lat,
  st_x(o.delivery_location::geometry) as delivery_lng,
  o.assigned_driver_id, o.failure_reason, o.reassigned_at, o.reassigned_by,
  o.assigned_at, o.picked_up_at, o.delivered_at, o.failed_at, o.created_at, o.updated_at,
  p.name as pharmacy_name, p.phone as pharmacy_phone, p.address_line as pharmacy_address_line,
  p.city as pharmacy_city, p.postal_code as pharmacy_postal_code,
  st_y(p.location::geometry) as pharmacy_lat, st_x(p.location::geometry) as pharmacy_lng,
  o.requires_refrigeration, o.has_narcotics, o.cash_to_collect
from public.orders o
join public.pharmacies p on p.id = o.pharmacy_id;

create or replace view public.orders_admin
with (security_invoker = true)
as
select
  id, pharmacy_id, order_type, status, source, patient_name, patient_phone,
  delivery_city, delivery_postal_code,
  assigned_driver_id, rejection_reason, cancellation_reason, failure_reason,
  escalated_at, escalation_status, escalation_note, escalation_resolved_at,
  reassigned_at, reassigned_by, delivery_fee_charged,
  accepted_at, ready_at, assigned_at, picked_up_at, delivered_at, failed_at,
  rejected_at, cancelled_at, timed_out_at, created_at, updated_at,
  delivery_type,
  delivery_address_line, delivery_notes,
  delivery_distance_m, delivery_duration_s, delivery_route_avoids_tolls, delivery_route_computed_at,
  delivery_attempt,
  delivery_price_source, delivery_quote_min, delivery_quote_max,
  requires_refrigeration, has_narcotics, cash_to_collect
from public.orders;
