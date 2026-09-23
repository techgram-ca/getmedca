-- ---------------------------------------------------------------------
-- 0007 · Five delivery zones, priced by postal area with a distance fallback
--
-- Delivery pricing was three named tiers the admin picked by hand. It becomes
-- five zones resolved automatically when the order arrives:
--
--   Zone 1 Local / 2 Nearby / 3 Regional / 4 Extended  — fixed price
--   Zone 5 Remote                                      — per km
--
-- Resolution order, per order:
--   1. The delivery postal code (FSA) is tagged to a zone for this pharmacy
--      → that zone's fixed price. Automatic.
--   2. Untagged → the driving distance falls in a band → that zone's fixed
--      price. Automatic.
--   3. Beyond the last band → Zone 5, priced per km, quoted to the pharmacy as
--      a span the admin confirms within.
--   4. No route at all → the admin sets the price by hand.
--
-- Every price is per-pharmacy with a platform default, as before.
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- Enum: the old tiers map onto the new zones one for one, with zone4 new.
-- `custom` becomes zone5: both mean "the admin types the price".
-- A fresh type is created and swapped rather than renaming values in place,
-- so the whole change lands in one transaction.
-- ---------------------------------------------------------------------
create type public.delivery_zone as enum ('zone1', 'zone2', 'zone3', 'zone4', 'zone5');

-- How an order's zone was decided. Kept on the order so support can explain a
-- price without re-deriving it, and so reporting can tell tagged from inferred.
create type public.delivery_price_source as enum ('tagged', 'band', 'remote', 'manual');

drop view public.orders_admin;
alter table public.pharmacy_delivery_pricing drop constraint pharmacy_delivery_pricing_not_custom;

create or replace function pg_temp.zone_of(old text)
returns public.delivery_zone language sql immutable as $$
  select (case old
    when 'local' then 'zone1'
    when 'gta' then 'zone2'
    when 'extended' then 'zone3'
    when 'custom' then 'zone5'
  end)::public.delivery_zone;
$$;

alter table public.orders
  alter column delivery_type type public.delivery_zone using pg_temp.zone_of(delivery_type::text);
alter table public.pharmacy_delivery_pricing
  alter column delivery_type type public.delivery_zone using pg_temp.zone_of(delivery_type::text);
alter table public.order_charges
  alter column delivery_type type public.delivery_zone using pg_temp.zone_of(delivery_type::text);

drop type public.delivery_type;

-- Zone 5 has no configured price: it is worked out per order from the distance.
alter table public.pharmacy_delivery_pricing
  add constraint pharmacy_delivery_pricing_not_remote check (delivery_type <> 'zone5');

-- ---------------------------------------------------------------------
-- Postal areas: the FSA (first three characters of a postal code) is what the
-- pricing actually matches on. City is the label the admin configures by —
-- municipality names are ambiguous in the GTA (Scarborough, Stoney Creek,
-- Bowmanville are all inside larger cities), FSAs are not.
-- ---------------------------------------------------------------------
create table public.postal_areas (
  fsa text primary key constraint postal_areas_fsa_format check (fsa ~ '^[A-Z][0-9][A-Z]$'),
  city text not null,
  province text not null default 'ON',
  created_at timestamptz not null default now()
);
create index postal_areas_city_idx on public.postal_areas (city);

-- Which zone a pharmacy charges for a given postal area. Per pharmacy: the
-- same FSA is Zone 1 for a pharmacy next door and Zone 3 for one across town.
create table public.pharmacy_zone_areas (
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  fsa text not null references public.postal_areas (fsa) on delete cascade,
  zone public.delivery_zone not null
    constraint pharmacy_zone_areas_not_remote check (zone <> 'zone5'),
  created_at timestamptz not null default now(),
  -- One zone per postal area per pharmacy: a postal code cannot be two prices.
  primary key (pharmacy_id, fsa)
);
create index pharmacy_zone_areas_pharmacy_idx on public.pharmacy_zone_areas (pharmacy_id);

-- ---------------------------------------------------------------------
-- Platform defaults: four fixed zone prices, a per-km rate for Zone 5, and the
-- distance bands used when a postal code is not tagged.
-- ---------------------------------------------------------------------
alter table public.platform_settings rename column default_local_fee to default_zone1_fee;
alter table public.platform_settings rename column default_gta_fee to default_zone2_fee;
alter table public.platform_settings rename column default_extended_fee to default_zone3_fee;

alter table public.platform_settings
  add column default_zone4_fee numeric(10,2) not null default 18.00,
  add column default_remote_per_km numeric(10,2) not null default 1.20
    constraint platform_settings_per_km_positive check (default_remote_per_km >= 0),
  -- Upper bound of each band in km, lower bound inclusive and upper exclusive:
  -- exactly 6.0 km is Zone 2, not Zone 1. Beyond the last band is Zone 5.
  add column zone1_max_km numeric(6,2) not null default 6,
  add column zone2_max_km numeric(6,2) not null default 13,
  add column zone3_max_km numeric(6,2) not null default 25,
  add column zone4_max_km numeric(6,2) not null default 50,
  -- How far above the computed per-km price the admin may go on a Zone 5 order.
  add column remote_quote_span numeric(10,2) not null default 6.00
    constraint platform_settings_quote_span_positive check (remote_quote_span >= 0),
  add constraint platform_settings_bands_ascending
    check (zone1_max_km < zone2_max_km and zone2_max_km < zone3_max_km and zone3_max_km < zone4_max_km);

-- Per-pharmacy overrides for the things that are not a fixed zone price.
-- Null means "use the platform default", same rule as pharmacy_delivery_pricing.
create table public.pharmacy_delivery_config (
  pharmacy_id uuid primary key references public.pharmacies (id) on delete cascade,
  remote_per_km numeric(10,2) constraint pharmacy_delivery_config_per_km_positive check (remote_per_km is null or remote_per_km >= 0),
  zone1_max_km numeric(6,2),
  zone2_max_km numeric(6,2),
  zone3_max_km numeric(6,2),
  zone4_max_km numeric(6,2),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Orders carry how the price was reached, and the span quoted to the pharmacy
-- before an admin confirmed it. Both are snapshots: retagging a postal area or
-- changing a rate never reprices an order already quoted.
-- ---------------------------------------------------------------------
alter table public.orders
  add column delivery_price_source public.delivery_price_source,
  add column delivery_quote_min numeric(10,2),
  add column delivery_quote_max numeric(10,2);

-- Orders priced before zones existed keep their fee and are marked manual,
-- rather than claiming a zone they were never resolved into.
update public.orders set delivery_price_source = 'manual' where delivery_type is not null;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.postal_areas enable row level security;
alter table public.pharmacy_zone_areas enable row level security;
alter table public.pharmacy_delivery_config enable row level security;

-- Postal areas are reference data with nothing private in them.
create policy "postal_areas: read" on public.postal_areas for select using (true);
create policy "postal_areas: admin writes" on public.postal_areas for all
  using (public.is_admin()) with check (public.is_admin());

create policy "pharmacy_zone_areas: pharmacy reads own" on public.pharmacy_zone_areas for select
  using (public.owns_pharmacy(pharmacy_id) or public.is_admin());
create policy "pharmacy_zone_areas: admin writes" on public.pharmacy_zone_areas for all
  using (public.is_admin()) with check (public.is_admin());

create policy "pharmacy_delivery_config: pharmacy reads own" on public.pharmacy_delivery_config for select
  using (public.owns_pharmacy(pharmacy_id) or public.is_admin());
create policy "pharmacy_delivery_config: admin writes" on public.pharmacy_delivery_config for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Admin order view. Columns can only be appended — `create or replace view`
-- refuses a reorder or rename, and this one is dropped and rebuilt above.
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Seed: GTA + Hamilton postal areas (218 FSAs, 30 cities).
-- Cities are labels for the admin UI; matching is always on the FSA, so a
-- label that disagrees with what Mapbox calls the place changes nothing.
-- Safe to re-run.
-- ---------------------------------------------------------------------
insert into public.postal_areas (fsa, city, province) values
  -- Toronto
  ('M1B', 'Toronto', 'ON'),
  ('M1C', 'Toronto', 'ON'),
  ('M1E', 'Toronto', 'ON'),
  ('M1G', 'Toronto', 'ON'),
  ('M1H', 'Toronto', 'ON'),
  ('M1J', 'Toronto', 'ON'),
  ('M1K', 'Toronto', 'ON'),
  ('M1L', 'Toronto', 'ON'),
  ('M1M', 'Toronto', 'ON'),
  ('M1N', 'Toronto', 'ON'),
  ('M1P', 'Toronto', 'ON'),
  ('M1R', 'Toronto', 'ON'),
  ('M1S', 'Toronto', 'ON'),
  ('M1T', 'Toronto', 'ON'),
  ('M1V', 'Toronto', 'ON'),
  ('M1W', 'Toronto', 'ON'),
  ('M1X', 'Toronto', 'ON'),
  ('M2H', 'Toronto', 'ON'),
  ('M2J', 'Toronto', 'ON'),
  ('M2K', 'Toronto', 'ON'),
  ('M2L', 'Toronto', 'ON'),
  ('M2M', 'Toronto', 'ON'),
  ('M2N', 'Toronto', 'ON'),
  ('M2P', 'Toronto', 'ON'),
  ('M2R', 'Toronto', 'ON'),
  ('M3A', 'Toronto', 'ON'),
  ('M3B', 'Toronto', 'ON'),
  ('M3C', 'Toronto', 'ON'),
  ('M3H', 'Toronto', 'ON'),
  ('M3J', 'Toronto', 'ON'),
  ('M3K', 'Toronto', 'ON'),
  ('M3L', 'Toronto', 'ON'),
  ('M3M', 'Toronto', 'ON'),
  ('M3N', 'Toronto', 'ON'),
  ('M4A', 'Toronto', 'ON'),
  ('M4B', 'Toronto', 'ON'),
  ('M4C', 'Toronto', 'ON'),
  ('M4E', 'Toronto', 'ON'),
  ('M4G', 'Toronto', 'ON'),
  ('M4H', 'Toronto', 'ON'),
  ('M4J', 'Toronto', 'ON'),
  ('M4K', 'Toronto', 'ON'),
  ('M4L', 'Toronto', 'ON'),
  ('M4M', 'Toronto', 'ON'),
  ('M4N', 'Toronto', 'ON'),
  ('M4P', 'Toronto', 'ON'),
  ('M4R', 'Toronto', 'ON'),
  ('M4S', 'Toronto', 'ON'),
  ('M4T', 'Toronto', 'ON'),
  ('M4V', 'Toronto', 'ON'),
  ('M4W', 'Toronto', 'ON'),
  ('M4X', 'Toronto', 'ON'),
  ('M4Y', 'Toronto', 'ON'),
  ('M5A', 'Toronto', 'ON'),
  ('M5B', 'Toronto', 'ON'),
  ('M5C', 'Toronto', 'ON'),
  ('M5E', 'Toronto', 'ON'),
  ('M5G', 'Toronto', 'ON'),
  ('M5H', 'Toronto', 'ON'),
  ('M5J', 'Toronto', 'ON'),
  ('M5K', 'Toronto', 'ON'),
  ('M5L', 'Toronto', 'ON'),
  ('M5M', 'Toronto', 'ON'),
  ('M5N', 'Toronto', 'ON'),
  ('M5P', 'Toronto', 'ON'),
  ('M5R', 'Toronto', 'ON'),
  ('M5S', 'Toronto', 'ON'),
  ('M5T', 'Toronto', 'ON'),
  ('M5V', 'Toronto', 'ON'),
  ('M5W', 'Toronto', 'ON'),
  ('M5X', 'Toronto', 'ON'),
  ('M6A', 'Toronto', 'ON'),
  ('M6B', 'Toronto', 'ON'),
  ('M6C', 'Toronto', 'ON'),
  ('M6E', 'Toronto', 'ON'),
  ('M6G', 'Toronto', 'ON'),
  ('M6H', 'Toronto', 'ON'),
  ('M6J', 'Toronto', 'ON'),
  ('M6K', 'Toronto', 'ON'),
  ('M6L', 'Toronto', 'ON'),
  ('M6M', 'Toronto', 'ON'),
  ('M6N', 'Toronto', 'ON'),
  ('M6P', 'Toronto', 'ON'),
  ('M6R', 'Toronto', 'ON'),
  ('M6S', 'Toronto', 'ON'),
  ('M8V', 'Toronto', 'ON'),
  ('M8W', 'Toronto', 'ON'),
  ('M8X', 'Toronto', 'ON'),
  ('M8Y', 'Toronto', 'ON'),
  ('M8Z', 'Toronto', 'ON'),
  ('M9A', 'Toronto', 'ON'),
  ('M9B', 'Toronto', 'ON'),
  ('M9C', 'Toronto', 'ON'),
  ('M9L', 'Toronto', 'ON'),
  ('M9M', 'Toronto', 'ON'),
  ('M9N', 'Toronto', 'ON'),
  ('M9P', 'Toronto', 'ON'),
  ('M9R', 'Toronto', 'ON'),
  ('M9V', 'Toronto', 'ON'),
  ('M9W', 'Toronto', 'ON'),
  -- Mississauga
  ('L4T', 'Mississauga', 'ON'),
  ('L4V', 'Mississauga', 'ON'),
  ('L4W', 'Mississauga', 'ON'),
  ('L4X', 'Mississauga', 'ON'),
  ('L4Y', 'Mississauga', 'ON'),
  ('L4Z', 'Mississauga', 'ON'),
  ('L5A', 'Mississauga', 'ON'),
  ('L5B', 'Mississauga', 'ON'),
  ('L5C', 'Mississauga', 'ON'),
  ('L5E', 'Mississauga', 'ON'),
  ('L5G', 'Mississauga', 'ON'),
  ('L5H', 'Mississauga', 'ON'),
  ('L5J', 'Mississauga', 'ON'),
  ('L5K', 'Mississauga', 'ON'),
  ('L5L', 'Mississauga', 'ON'),
  ('L5M', 'Mississauga', 'ON'),
  ('L5N', 'Mississauga', 'ON'),
  ('L5P', 'Mississauga', 'ON'),
  ('L5R', 'Mississauga', 'ON'),
  ('L5S', 'Mississauga', 'ON'),
  ('L5T', 'Mississauga', 'ON'),
  ('L5V', 'Mississauga', 'ON'),
  ('L5W', 'Mississauga', 'ON'),
  -- Brampton
  ('L6P', 'Brampton', 'ON'),
  ('L6R', 'Brampton', 'ON'),
  ('L6S', 'Brampton', 'ON'),
  ('L6T', 'Brampton', 'ON'),
  ('L6V', 'Brampton', 'ON'),
  ('L6W', 'Brampton', 'ON'),
  ('L6X', 'Brampton', 'ON'),
  ('L6Y', 'Brampton', 'ON'),
  ('L6Z', 'Brampton', 'ON'),
  ('L7A', 'Brampton', 'ON'),
  -- Bolton
  ('L7E', 'Bolton', 'ON'),
  -- Caledon
  ('L7C', 'Caledon', 'ON'),
  ('L7K', 'Caledon', 'ON'),
  -- Vaughan
  ('L4H', 'Vaughan', 'ON'),
  ('L4J', 'Vaughan', 'ON'),
  ('L4K', 'Vaughan', 'ON'),
  ('L4L', 'Vaughan', 'ON'),
  ('L6A', 'Vaughan', 'ON'),
  -- Markham
  ('L3P', 'Markham', 'ON'),
  ('L3R', 'Markham', 'ON'),
  ('L3S', 'Markham', 'ON'),
  ('L3T', 'Markham', 'ON'),
  ('L6B', 'Markham', 'ON'),
  ('L6C', 'Markham', 'ON'),
  ('L6E', 'Markham', 'ON'),
  ('L6G', 'Markham', 'ON'),
  -- Richmond Hill
  ('L4B', 'Richmond Hill', 'ON'),
  ('L4C', 'Richmond Hill', 'ON'),
  ('L4E', 'Richmond Hill', 'ON'),
  ('L4S', 'Richmond Hill', 'ON'),
  -- Aurora
  ('L4G', 'Aurora', 'ON'),
  -- Newmarket
  ('L3X', 'Newmarket', 'ON'),
  ('L3Y', 'Newmarket', 'ON'),
  -- Stouffville
  ('L4A', 'Stouffville', 'ON'),
  -- King
  ('L7B', 'King', 'ON'),
  -- East Gwillimbury
  ('L9N', 'East Gwillimbury', 'ON'),
  -- Georgina
  ('L0E', 'Georgina', 'ON'),
  -- Pickering
  ('L1V', 'Pickering', 'ON'),
  ('L1W', 'Pickering', 'ON'),
  ('L1X', 'Pickering', 'ON'),
  ('L1Y', 'Pickering', 'ON'),
  -- Ajax
  ('L1S', 'Ajax', 'ON'),
  ('L1T', 'Ajax', 'ON'),
  ('L1Z', 'Ajax', 'ON'),
  -- Whitby
  ('L1M', 'Whitby', 'ON'),
  ('L1N', 'Whitby', 'ON'),
  ('L1P', 'Whitby', 'ON'),
  ('L1R', 'Whitby', 'ON'),
  -- Oshawa
  ('L1G', 'Oshawa', 'ON'),
  ('L1H', 'Oshawa', 'ON'),
  ('L1J', 'Oshawa', 'ON'),
  ('L1K', 'Oshawa', 'ON'),
  ('L1L', 'Oshawa', 'ON'),
  -- Clarington
  ('L1B', 'Clarington', 'ON'),
  -- Bowmanville
  ('L1C', 'Bowmanville', 'ON'),
  ('L1E', 'Bowmanville', 'ON'),
  -- Uxbridge
  ('L0C', 'Uxbridge', 'ON'),
  -- Port Perry
  ('L0B', 'Port Perry', 'ON'),
  -- Oakville
  ('L6H', 'Oakville', 'ON'),
  ('L6J', 'Oakville', 'ON'),
  ('L6K', 'Oakville', 'ON'),
  ('L6L', 'Oakville', 'ON'),
  ('L6M', 'Oakville', 'ON'),
  -- Burlington
  ('L7L', 'Burlington', 'ON'),
  ('L7M', 'Burlington', 'ON'),
  ('L7N', 'Burlington', 'ON'),
  ('L7P', 'Burlington', 'ON'),
  ('L7R', 'Burlington', 'ON'),
  ('L7S', 'Burlington', 'ON'),
  ('L7T', 'Burlington', 'ON'),
  -- Milton
  ('L9E', 'Milton', 'ON'),
  ('L9T', 'Milton', 'ON'),
  -- Georgetown
  ('L7G', 'Georgetown', 'ON'),
  -- Acton
  ('L7J', 'Acton', 'ON'),
  -- Waterdown
  ('L8B', 'Waterdown', 'ON'),
  -- Stoney Creek
  ('L8E', 'Stoney Creek', 'ON'),
  ('L8G', 'Stoney Creek', 'ON'),
  ('L8H', 'Stoney Creek', 'ON'),
  ('L8K', 'Stoney Creek', 'ON'),
  -- Hamilton
  ('L8J', 'Hamilton', 'ON'),
  ('L8L', 'Hamilton', 'ON'),
  ('L8M', 'Hamilton', 'ON'),
  ('L8N', 'Hamilton', 'ON'),
  ('L8P', 'Hamilton', 'ON'),
  ('L8R', 'Hamilton', 'ON'),
  ('L8S', 'Hamilton', 'ON'),
  ('L8T', 'Hamilton', 'ON'),
  ('L8V', 'Hamilton', 'ON'),
  ('L8W', 'Hamilton', 'ON'),
  ('L9A', 'Hamilton', 'ON'),
  ('L9B', 'Hamilton', 'ON'),
  ('L9C', 'Hamilton', 'ON'),
  ('L9G', 'Hamilton', 'ON'),
  ('L9H', 'Hamilton', 'ON'),
  ('L9K', 'Hamilton', 'ON')
on conflict (fsa) do update set city = excluded.city;
