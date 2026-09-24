-- ---------------------------------------------------------------------
-- 0008 · Drop the distance bands
--
-- 0007 gave an untagged postal code a fallback: the driving distance picked
-- one of the fixed zones. That is gone. A delivery is now priced one of two
-- ways, and nothing in between:
--
--   the postal code is tagged to a zone for this pharmacy  → fixed price
--   anything else                                          → Zone 5, per km
--
-- Which means an untagged postal code always reaches an admin, and the low
-- per-km price on a nearby one is the signal that it should be tagged.
-- ---------------------------------------------------------------------

alter table public.platform_settings
  drop constraint platform_settings_bands_ascending,
  drop column zone1_max_km,
  drop column zone2_max_km,
  drop column zone3_max_km,
  drop column zone4_max_km;

-- The per-km rate is the only thing left to override per pharmacy.
alter table public.pharmacy_delivery_config
  drop column zone1_max_km,
  drop column zone2_max_km,
  drop column zone3_max_km,
  drop column zone4_max_km;

-- 'band' can no longer be produced. Any order already carrying it was priced
-- from a distance rather than from a tag, which is what 'manual' means now.
create type public.delivery_price_source_new as enum ('tagged', 'remote', 'manual');

drop view public.orders_admin;

alter table public.orders
  alter column delivery_price_source type public.delivery_price_source_new
  using (case delivery_price_source::text when 'band' then 'manual' else delivery_price_source::text end)::public.delivery_price_source_new;

drop type public.delivery_price_source;
alter type public.delivery_price_source_new rename to delivery_price_source;

-- Rebuilt unchanged: columns can only be appended, never reordered or renamed.
create view public.orders_admin
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
  delivery_price_source, delivery_quote_min, delivery_quote_max
from public.orders;
