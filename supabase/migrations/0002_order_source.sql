-- =====================================================================
-- Order source: distinguish patient-submitted (online) orders from orders
-- a pharmacy enters manually (phone / walk-in) in its dashboard.
-- =====================================================================

create type public.order_source as enum ('online', 'manual');

alter table public.orders
  add column source public.order_source not null default 'online',
  add column created_by uuid references auth.users (id);

create index orders_source_idx on public.orders (pharmacy_id, source);

-- Expose the source on the PHI-free admin projection (appended column).
create or replace view public.orders_admin
with (security_invoker = true)
as
select
  id, pharmacy_id, order_type, status, patient_name, patient_phone,
  delivery_city, delivery_postal_code,
  assigned_driver_id, rejection_reason, cancellation_reason, failure_reason,
  escalated_at, escalation_status, escalation_note, escalation_resolved_at,
  reassigned_at, reassigned_by, delivery_fee_charged,
  accepted_at, ready_at, assigned_at, picked_up_at, delivered_at, failed_at,
  rejected_at, cancelled_at, timed_out_at, created_at, updated_at,
  source
from public.orders;
