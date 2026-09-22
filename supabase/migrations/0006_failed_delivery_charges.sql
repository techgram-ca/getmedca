-- ---------------------------------------------------------------------
-- 0006 · Failed deliveries are billable, retryable, and better evidenced
--
-- Three things this adds:
--  1. A failed delivery now bills the pharmacy. The driver made the trip.
--  2. A failed order can be put back to ready_for_delivery for another
--     attempt, which means one order can be charged more than once — so
--     charges move out of the single `orders.delivery_fee_charged` column
--     and into their own table, one row per attempt.
--  3. Proof of delivery carries the driver's note alongside photo+signature.
-- ---------------------------------------------------------------------

-- What share of the quoted delivery fee a failed attempt bills. 100 = the
-- full fee (the default: the driver drove the route either way), 0 = free.
alter table public.platform_settings
  add column failed_delivery_fee_percent numeric(5,2) not null default 100
    constraint platform_settings_failed_fee_percent_range check (failed_delivery_fee_percent between 0 and 100);

create type public.order_charge_kind as enum ('delivery', 'failed_delivery');

-- One row per billable event. An order retried after a failed attempt has a
-- failed_delivery row for the first trip and a delivery row for the second,
-- which is why the order's own column cannot be the billing record.
create table public.order_charges (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  kind public.order_charge_kind not null,
  amount numeric(10,2) not null constraint order_charges_amount_non_negative check (amount >= 0),
  delivery_type public.delivery_type,
  -- Which delivery attempt produced this charge (1 for the first trip).
  attempt int not null default 1,
  created_at timestamptz not null default now(),
  -- One charge per outcome per attempt, so a retried action cannot double-bill.
  constraint order_charges_unique_attempt unique (order_id, kind, attempt)
);
create index order_charges_pharmacy_idx on public.order_charges (pharmacy_id, created_at desc);
create index order_charges_order_idx on public.order_charges (order_id);

alter table public.order_charges enable row level security;
create policy "order_charges: pharmacy reads own" on public.order_charges for select
  using (public.owns_pharmacy(pharmacy_id) or public.is_admin());
create policy "order_charges: admin" on public.order_charges for all
  using (public.is_admin()) with check (public.is_admin());

-- Which trip the order is on. Bumped when a failed order goes back out.
alter table public.orders
  add column delivery_attempt int not null default 1
    constraint orders_delivery_attempt_positive check (delivery_attempt >= 1);

-- The driver's note when handing the order over.
alter table public.proof_of_delivery add column note text;

-- Existing delivered orders were billed from orders.delivery_fee_charged.
-- Carry them across so invoices for past months do not drop to zero.
insert into public.order_charges (order_id, pharmacy_id, kind, amount, delivery_type, attempt, created_at)
select o.id, o.pharmacy_id, 'delivery', o.delivery_fee_charged, o.delivery_type, 1, coalesce(o.delivered_at, o.updated_at)
from public.orders o
where o.status = 'delivered' and o.delivery_fee_charged is not null
on conflict do nothing;

-- Admin order view: expose the attempt counter alongside the rest. Columns can
-- only be appended — `create or replace view` refuses a reorder or rename.
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
  delivery_attempt
from public.orders;
