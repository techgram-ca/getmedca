-- =====================================================================
-- Stored driving distance per order.
--
-- The pharmacy-to-patient distance is computed once and saved, rather than
-- recalculated on every page view, so the admin sees a stable number when
-- choosing a delivery type and we do not pay for repeat routing calls.
--
-- Routes are requested as car-drivable and toll-free. Where no toll-free
-- route exists we fall back to the normal driving route and record that with
-- `delivery_route_avoids_tolls = false`, so the number is never silently
-- misleading.
--
-- Also exposes the delivery address to the admin portal: support needs it to
-- pick the right delivery tier and to help a patient when a delivery fails.
-- Prescription files, insurance, health card and date of birth stay redacted.
-- =====================================================================

alter table public.orders
  add column delivery_distance_m numeric(10,1),
  add column delivery_duration_s integer,
  add column delivery_route_avoids_tolls boolean,
  add column delivery_route_computed_at timestamptz;

-- Coordinates for an order's route. PostgREST returns geography columns as WKB
-- hex, so the app reads them through st_x/st_y here (same pattern as
-- pharmacies_near and the orders_driver view).
create or replace function public.order_route_points(p_order_id uuid)
returns table (
  from_lat double precision,
  from_lng double precision,
  to_lat double precision,
  to_lng double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    st_y(p.location::geometry), st_x(p.location::geometry),
    st_y(o.delivery_location::geometry), st_x(o.delivery_location::geometry)
  from public.orders o
  join public.pharmacies p on p.id = o.pharmacy_id
  where o.id = p_order_id
    and p.location is not null
    and o.delivery_location is not null;
$$;

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
  delivery_distance_m, delivery_duration_s, delivery_route_avoids_tolls, delivery_route_computed_at
from public.orders;
