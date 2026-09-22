-- =====================================================================
-- Per-pharmacy delivery pricing.
--
-- Replaces the single platform-wide flat fee with four delivery types.
-- Local, GTA and Extended carry a price; Custom is priced per order by the
-- admin. Each pharmacy may override the platform defaults; where it has no
-- override, the default applies.
--
-- The admin chooses the delivery type before assigning a driver, and the
-- resolved price is snapshotted onto the order at that moment, so later
-- pricing changes never alter an order that has already been quoted.
-- =====================================================================

create type public.delivery_type as enum ('local', 'gta', 'extended', 'custom');

-- ---------------------------------------------------------------------
-- Platform defaults replace the single flat fee
-- ---------------------------------------------------------------------
alter table public.platform_settings
  add column default_local_fee numeric(10,2) not null default 5.00,
  add column default_gta_fee numeric(10,2) not null default 8.00,
  add column default_extended_fee numeric(10,2) not null default 12.00;

-- Carry the previous flat fee across so nothing is repriced by this migration.
update public.platform_settings
set default_local_fee = flat_delivery_fee,
    default_gta_fee = flat_delivery_fee,
    default_extended_fee = flat_delivery_fee
where id = 1;

alter table public.platform_settings drop column flat_delivery_fee;

-- ---------------------------------------------------------------------
-- Per-pharmacy overrides. A missing row means "use the platform default".
-- Custom has no configured price: it is entered per order.
-- ---------------------------------------------------------------------
create table public.pharmacy_delivery_pricing (
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  delivery_type public.delivery_type not null,
  price numeric(10,2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  primary key (pharmacy_id, delivery_type),
  constraint pharmacy_delivery_pricing_not_custom check (delivery_type <> 'custom')
);

create index pharmacy_delivery_pricing_pharmacy_idx on public.pharmacy_delivery_pricing (pharmacy_id);

alter table public.pharmacy_delivery_pricing enable row level security;

create policy "pharmacy_delivery_pricing: pharmacy reads own"
  on public.pharmacy_delivery_pricing for select
  using (public.owns_pharmacy(pharmacy_id) or public.is_admin());

create policy "pharmacy_delivery_pricing: admin writes"
  on public.pharmacy_delivery_pricing for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Orders carry the chosen type alongside the existing price snapshot
-- ---------------------------------------------------------------------
alter table public.orders
  add column delivery_type public.delivery_type,
  add column delivery_type_set_at timestamptz;

create index orders_delivery_type_idx
  on public.orders (pharmacy_id, delivery_type)
  where delivery_type is not null;

-- Orders delivered before this change keep their fee but have no type; they
-- are reported under "Uncategorised" rather than being silently reclassified.

-- ---------------------------------------------------------------------
-- Admin projection gains the delivery type (still no PHI)
-- ---------------------------------------------------------------------
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
  delivery_type
from public.orders;
