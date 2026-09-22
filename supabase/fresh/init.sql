-- =====================================================================
-- GetMed — full schema for a fresh setup (includes delivery pricing)
-- Region: the hosted Supabase project MUST live in ca-central-1 (Montreal).
-- Principle: order-state-machine logic lives in app code (packages/core).
-- RLS here enforces ACCESS CONTROL ONLY.
-- =====================================================================

create extension if not exists postgis;
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------
create type public.user_role as enum ('admin', 'pharmacy', 'driver');
create type public.pharmacy_status as enum ('pending', 'approved', 'inactive');
create type public.order_type as enum ('new', 'transfer');
create type public.order_status as enum (
  'pending', 'accepted', 'ready_for_delivery', 'assigned', 'picked_up',
  'delivered', 'failed', 'rejected', 'cancelled', 'timed_out'
);
create type public.escalation_status as enum ('open', 'contacted', 'resolved');
create type public.consultation_status as enum ('new', 'contacted', 'resolved');
create type public.callback_window as enum ('morning', 'afternoon', 'evening');
create type public.notification_channel as enum ('sms', 'email');
create type public.form_applies_to as enum ('new_order', 'transfer', 'consultation');
create type public.otp_purpose as enum ('order', 'consultation');
-- online = submitted by the patient (OTP + SLA); manual = entered by the pharmacy in its dashboard
create type public.order_source as enum ('online', 'manual');
-- Local/GTA/Extended carry a configured price; Custom is priced per order.
create type public.delivery_type as enum ('local', 'gta', 'extended', 'custom');

-- ---------------------------------------------------------------------
-- Profiles (one row per auth user; role drives RLS)
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'pharmacy',
  full_name text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.user_role := 'pharmacy';
begin
  if new.raw_user_meta_data ? 'role' then
    begin
      v_role := (new.raw_user_meta_data ->> 'role')::public.user_role;
    exception when others then
      v_role := 'pharmacy';
    end;
  end if;
  -- admin role can never be self-assigned at signup
  if v_role = 'admin' then
    v_role := 'pharmacy';
  end if;
  insert into public.profiles (id, role, full_name)
  values (new.id, v_role, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper: current role (stable, used by policies)
create or replace function public.current_role_name()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'admin' from public.profiles where id = auth.uid()), false);
$$;

-- ---------------------------------------------------------------------
-- Pharmacies
-- ---------------------------------------------------------------------
create table public.pharmacies (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid unique references auth.users (id) on delete set null,
  slug text unique,
  status public.pharmacy_status not null default 'pending',
  -- step 1: business basics
  name text,
  email text,
  phone text,
  address_line text,
  city text,
  province text default 'ON',
  postal_code text,
  location geography(Point, 4326),
  -- step 2: licensing
  license_number text,
  license_province text default 'ON',
  license_college text,
  license_doc_path text,
  pic_name text,
  pic_license_number text,
  -- step 5: hours & delivery
  hours jsonb not null default '{}'::jsonb,
  delivery_radius_km numeric(6,2),
  estimated_delivery_time text,
  offers_delivery boolean not null default true,
  offers_transfer boolean not null default true,
  offers_consultation boolean not null default true,
  accepted_insurance text[] not null default '{}',
  accessibility_notes text,
  -- step 6: branding
  logo_path text,
  cover_path text,
  tagline text,
  bio text,
  gallery_paths text[] not null default '{}',
  -- signup / lifecycle
  signup_step int not null default 1,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_reason text,
  inactive_reason text,
  notify_sms boolean not null default true,
  notify_email boolean not null default true,
  notify_sound boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index pharmacies_location_gix on public.pharmacies using gist (location);
create index pharmacies_status_idx on public.pharmacies (status);

create table public.pharmacists (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  name text not null,
  photo_path text,
  credentials text,
  years_experience int,
  bio text,
  languages text[] not null default '{}',
  is_main boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index pharmacists_pharmacy_idx on public.pharmacists (pharmacy_id);

create table public.pharmacy_services (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2),
  duration_minutes int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index pharmacy_services_pharmacy_idx on public.pharmacy_services (pharmacy_id);

create table public.issues (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.pharmacy_issues (
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  issue_id uuid not null references public.issues (id) on delete cascade,
  primary key (pharmacy_id, issue_id)
);

-- ---------------------------------------------------------------------
-- Drivers (admin-created; credentials live in auth.users)
-- ---------------------------------------------------------------------
create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  phone text not null,
  email text not null,
  vehicle_make text,
  vehicle_model text,
  vehicle_plate text,
  vehicle_color text,
  license_doc_path text,
  insurance_doc_path text,
  active boolean not null default true,
  push_subscription jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies (id),
  order_type public.order_type not null,
  status public.order_status not null default 'pending',
  source public.order_source not null default 'online',
  created_by uuid references auth.users (id),
  -- patient (PHI — never exposed to admin API responses beyond name/phone)
  patient_name text not null,
  patient_phone text not null,
  patient_dob date,
  delivery_address_line text not null,
  delivery_city text,
  delivery_postal_code text,
  delivery_location geography(Point, 4326),
  delivery_notes text,
  allergies text,
  prescription_file_path text,
  insurance_provider text,
  insurance_member_id text,
  insurance_group_number text,
  insurance_file_path text,
  health_card_number text,
  health_card_version text,
  health_card_file_path text,
  transfer_from_pharmacy_name text,
  transfer_from_phone text,
  transfer_from_fax text,
  transfer_prescription_number text,
  -- verification / consent
  phone_verified_at timestamptz,
  consent_given_at timestamptz not null,
  -- assignment
  assigned_driver_id uuid references public.drivers (id),
  -- outcome reasons (distinct fields for quality reporting)
  rejection_reason text,
  cancellation_reason text,
  failure_reason text,
  -- escalation
  escalated_at timestamptz,
  escalation_status public.escalation_status,
  escalation_note text,
  escalation_resolved_at timestamptz,
  -- reassignment log (no UI)
  reassigned_at timestamptz,
  reassigned_by uuid references public.drivers (id),
  -- driving distance pharmacy -> patient, computed once and stored (toll-free
  -- where a toll-free route exists; see delivery_route_avoids_tolls)
  delivery_distance_m numeric(10,1),
  delivery_duration_s integer,
  delivery_route_avoids_tolls boolean,
  delivery_route_computed_at timestamptz,
  -- delivery pricing: type chosen by admin before assigning a driver,
  -- price snapshotted at that moment
  delivery_type public.delivery_type,
  delivery_type_set_at timestamptz,
  delivery_fee_charged numeric(10,2),
  -- per-transition timestamps
  accepted_at timestamptz,
  ready_at timestamptz,
  assigned_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  failed_at timestamptz,
  rejected_at timestamptz,
  cancelled_at timestamptz,
  timed_out_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_pharmacy_idx on public.orders (pharmacy_id, created_at desc);
create index orders_status_idx on public.orders (status);
create index orders_driver_idx on public.orders (assigned_driver_id);
create index orders_source_idx on public.orders (pharmacy_id, source);
create index orders_delivery_type_idx on public.orders (pharmacy_id, delivery_type) where delivery_type is not null;
create index orders_escalated_idx on public.orders (escalated_at) where escalated_at is not null;
create index orders_delivered_idx on public.orders (pharmacy_id, delivered_at) where status = 'delivered';

create table public.order_events (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status,
  action text not null,
  actor_role text not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index order_events_order_idx on public.order_events (order_id, created_at);

create table public.proof_of_delivery (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  photo_path text not null,
  signature_path text not null,
  driver_id uuid references public.drivers (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- Consultations
-- ---------------------------------------------------------------------
create table public.consultation_requests (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id uuid not null references public.pharmacies (id),
  issue_id uuid references public.issues (id),
  service_id uuid references public.pharmacy_services (id),
  patient_name text not null,
  patient_phone text not null,
  description text,
  callback_window public.callback_window,
  status public.consultation_status not null default 'new',
  phone_verified_at timestamptz,
  consent_given_at timestamptz not null,
  pharmacy_note text,
  admin_note text,
  contacted_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index consultation_requests_pharmacy_idx on public.consultation_requests (pharmacy_id, created_at desc);

-- ---------------------------------------------------------------------
-- OTP + rate limiting + caches (service-role only)
-- ---------------------------------------------------------------------
create table public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  phone text not null,
  purpose public.otp_purpose not null,
  target_id uuid not null,
  code_hash text not null,
  attempts int not null default 0,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  ip text,
  created_at timestamptz not null default now()
);
create index otp_codes_target_idx on public.otp_codes (target_id, created_at desc);

create table public.rate_limits (
  key text primary key,
  count int not null default 0,
  window_start timestamptz not null default now()
);

create table public.search_cache (
  key text primary key,
  payload jsonb not null,
  expires_at timestamptz not null
);

-- ---------------------------------------------------------------------
-- Config tables
-- ---------------------------------------------------------------------
create table public.form_field_config (
  field_key text not null,
  applies_to public.form_applies_to not null,
  label text not null,
  required boolean not null default false,
  sort_order int not null default 0,
  primary key (field_key, applies_to)
);

create table public.notification_templates (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  channel public.notification_channel not null,
  subject text,
  template_text text not null,
  enabled boolean not null default true,
  template_editable boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (event_type, channel)
);

create table public.platform_settings (
  id int primary key default 1 check (id = 1),
  search_radius_km numeric(6,2) not null default 10,
  default_local_fee numeric(10,2) not null default 5.00,
  default_gta_fee numeric(10,2) not null default 8.00,
  default_extended_fee numeric(10,2) not null default 12.00,
  sla_minutes int not null default 30,
  updated_at timestamptz not null default now()
);

-- Per-pharmacy price overrides. A missing row means "use the platform default".
-- Custom has no configured price: it is entered per order by the admin.
create table public.pharmacy_delivery_pricing (
  pharmacy_id uuid not null references public.pharmacies (id) on delete cascade,
  delivery_type public.delivery_type not null,
  price numeric(10,2) not null check (price >= 0),
  updated_at timestamptz not null default now(),
  primary key (pharmacy_id, delivery_type),
  constraint pharmacy_delivery_pricing_not_custom check (delivery_type <> 'custom')
);
create index pharmacy_delivery_pricing_pharmacy_idx on public.pharmacy_delivery_pricing (pharmacy_id);

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  message text not null,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pharmacies_updated_at before update on public.pharmacies for each row execute function public.set_updated_at();
create trigger drivers_updated_at before update on public.drivers for each row execute function public.set_updated_at();
create trigger orders_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger consultation_requests_updated_at before update on public.consultation_requests for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Views: public-safe pharmacy and PHI-free admin order projections
-- ---------------------------------------------------------------------
create view public.pharmacies_public
with (security_invoker = false)
as
select
  id, slug, name, phone, address_line, city, province, postal_code,
  st_y(location::geometry) as lat, st_x(location::geometry) as lng,
  hours, delivery_radius_km, estimated_delivery_time,
  offers_delivery, offers_transfer, offers_consultation,
  accepted_insurance, accessibility_notes,
  logo_path, cover_path, tagline, bio, gallery_paths
from public.pharmacies
where status = 'approved';

-- Admin sees metadata + patient name/phone; NEVER prescription, insurance, health card.
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
  delivery_distance_m, delivery_duration_s, delivery_route_avoids_tolls, delivery_route_computed_at
from public.orders;

-- ---------------------------------------------------------------------
-- Search: PostGIS pre-filter (Stage 2 of discovery). Returns approved
-- pharmacies within a generous straight-line buffer; app code then calls
-- Mapbox Matrix for real driving distance and applies the admin radius.
-- ---------------------------------------------------------------------
create or replace function public.pharmacies_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_issue_slug text default null
)
returns table (
  id uuid, slug text, name text, phone text, address_line text, city text,
  postal_code text, lat double precision, lng double precision,
  logo_path text, tagline text, hours jsonb,
  estimated_delivery_time text, offers_delivery boolean,
  offers_transfer boolean, offers_consultation boolean,
  straight_line_m double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    p.id, p.slug, p.name, p.phone, p.address_line, p.city, p.postal_code,
    st_y(p.location::geometry), st_x(p.location::geometry),
    p.logo_path, p.tagline, p.hours, p.estimated_delivery_time,
    p.offers_delivery, p.offers_transfer, p.offers_consultation,
    st_distance(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
  from public.pharmacies p
  where p.status = 'approved'
    and p.location is not null
    and st_dwithin(p.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography, p_radius_m)
    and (
      p_issue_slug is null
      or exists (
        select 1 from public.pharmacy_issues pi
        join public.issues i on i.id = pi.issue_id
        where pi.pharmacy_id = p.id and i.slug = p_issue_slug and i.active
      )
    )
  order by 17
  limit 50;
$$;

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

-- Rate limit helper: atomically bump a counter within a window.
create or replace function public.bump_rate_limit(p_key text, p_window_seconds int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
begin
  insert into public.rate_limits (key, count, window_start)
  values (p_key, 1, now())
  on conflict (key) do update
    set count = case
      when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then 1
      else public.rate_limits.count + 1 end,
    window_start = case
      when public.rate_limits.window_start < now() - make_interval(secs => p_window_seconds) then now()
      else public.rate_limits.window_start end
  returning count into v_count;
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.pharmacies enable row level security;
alter table public.pharmacists enable row level security;
alter table public.pharmacy_services enable row level security;
alter table public.issues enable row level security;
alter table public.pharmacy_issues enable row level security;
alter table public.drivers enable row level security;
alter table public.orders enable row level security;
alter table public.order_events enable row level security;
alter table public.proof_of_delivery enable row level security;
alter table public.consultation_requests enable row level security;
alter table public.otp_codes enable row level security;
alter table public.rate_limits enable row level security;
alter table public.search_cache enable row level security;
alter table public.form_field_config enable row level security;
alter table public.notification_templates enable row level security;
alter table public.platform_settings enable row level security;
alter table public.pharmacy_delivery_pricing enable row level security;
alter table public.support_messages enable row level security;

-- profiles
create policy "profiles: self read" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "profiles: self update name" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- pharmacies
create policy "pharmacies: public read approved" on public.pharmacies for select using (status = 'approved' or owner_user_id = auth.uid() or public.is_admin());
create policy "pharmacies: owner insert" on public.pharmacies for insert with check (owner_user_id = auth.uid());
create policy "pharmacies: owner update" on public.pharmacies for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());
create policy "pharmacies: admin all" on public.pharmacies for all using (public.is_admin()) with check (public.is_admin());

-- helper: does the current user own pharmacy X
create or replace function public.owns_pharmacy(p_pharmacy_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pharmacies where id = p_pharmacy_id and owner_user_id = auth.uid());
$$;

create or replace function public.pharmacy_is_approved(p_pharmacy_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.pharmacies where id = p_pharmacy_id and status = 'approved');
$$;

create or replace function public.current_driver_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.drivers where user_id = auth.uid() and active;
$$;

-- pharmacists / services / issues join
create policy "pharmacists: read" on public.pharmacists for select using (public.pharmacy_is_approved(pharmacy_id) or public.owns_pharmacy(pharmacy_id) or public.is_admin());
create policy "pharmacists: owner write" on public.pharmacists for all using (public.owns_pharmacy(pharmacy_id)) with check (public.owns_pharmacy(pharmacy_id));
create policy "pharmacists: admin" on public.pharmacists for all using (public.is_admin()) with check (public.is_admin());

create policy "services: read" on public.pharmacy_services for select using (public.pharmacy_is_approved(pharmacy_id) or public.owns_pharmacy(pharmacy_id) or public.is_admin());
create policy "services: owner write" on public.pharmacy_services for all using (public.owns_pharmacy(pharmacy_id)) with check (public.owns_pharmacy(pharmacy_id));
create policy "services: admin" on public.pharmacy_services for all using (public.is_admin()) with check (public.is_admin());

create policy "issues: public read active" on public.issues for select using (active or public.is_admin());
create policy "issues: admin write" on public.issues for all using (public.is_admin()) with check (public.is_admin());

create policy "pharmacy_issues: read" on public.pharmacy_issues for select using (true);
create policy "pharmacy_issues: owner write" on public.pharmacy_issues for all using (public.owns_pharmacy(pharmacy_id)) with check (public.owns_pharmacy(pharmacy_id));
create policy "pharmacy_issues: admin" on public.pharmacy_issues for all using (public.is_admin()) with check (public.is_admin());

-- drivers
create policy "drivers: driver read (self + others for reassignment)" on public.drivers for select using (public.current_role_name() = 'driver' or public.is_admin());
create policy "drivers: admin write" on public.drivers for all using (public.is_admin()) with check (public.is_admin());

-- orders: pharmacies read their own; drivers read assigned; admin reads via orders_admin view.
-- All mutations go through the service layer (service role) which enforces the state machine.
create policy "orders: pharmacy read own" on public.orders for select using (public.owns_pharmacy(pharmacy_id));
create policy "orders: driver read assigned" on public.orders for select using (assigned_driver_id = public.current_driver_id());
create policy "orders: admin read" on public.orders for select using (public.is_admin());

create policy "order_events: read" on public.order_events for select using (
  public.is_admin()
  or exists (select 1 from public.orders o where o.id = order_id and (public.owns_pharmacy(o.pharmacy_id) or o.assigned_driver_id = public.current_driver_id()))
);

create policy "pod: read" on public.proof_of_delivery for select using (
  public.is_admin()
  or exists (select 1 from public.orders o where o.id = order_id and (public.owns_pharmacy(o.pharmacy_id) or o.assigned_driver_id = public.current_driver_id()))
);

-- consultations
create policy "consultations: pharmacy read own" on public.consultation_requests for select using (public.owns_pharmacy(pharmacy_id) or public.is_admin());
create policy "consultations: pharmacy update own" on public.consultation_requests for update using (public.owns_pharmacy(pharmacy_id)) with check (public.owns_pharmacy(pharmacy_id));
create policy "consultations: admin" on public.consultation_requests for all using (public.is_admin()) with check (public.is_admin());

-- config
create policy "form_field_config: public read" on public.form_field_config for select using (true);
create policy "form_field_config: admin write" on public.form_field_config for all using (public.is_admin()) with check (public.is_admin());

create policy "platform_settings: read" on public.platform_settings for select using (true);
create policy "platform_settings: admin write" on public.platform_settings for all using (public.is_admin()) with check (public.is_admin());

create policy "pharmacy_delivery_pricing: pharmacy reads own" on public.pharmacy_delivery_pricing for select using (public.owns_pharmacy(pharmacy_id) or public.is_admin());
create policy "pharmacy_delivery_pricing: admin writes" on public.pharmacy_delivery_pricing for all using (public.is_admin()) with check (public.is_admin());

create policy "notification_templates: admin" on public.notification_templates for all using (public.is_admin()) with check (public.is_admin());

create policy "support_messages: admin" on public.support_messages for all using (public.is_admin()) with check (public.is_admin());

-- otp_codes, rate_limits, search_cache: no policies => service role only.

-- ---------------------------------------------------------------------
-- Realtime
-- ---------------------------------------------------------------------
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.consultation_requests;

-- ---------------------------------------------------------------------
-- Storage buckets: ALL PRIVATE. Access is via short-lived signed URLs
-- generated server-side after an authorization check.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('prescriptions', 'prescriptions', false, 20971520, array['image/jpeg','image/png','image/webp','image/heic','application/pdf']),
  ('insurance', 'insurance', false, 20971520, array['image/jpeg','image/png','image/webp','image/heic','application/pdf']),
  ('health-cards', 'health-cards', false, 20971520, array['image/jpeg','image/png','image/webp','image/heic','application/pdf']),
  ('licensing', 'licensing', false, 20971520, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('pharmacy-media', 'pharmacy-media', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('driver-docs', 'driver-docs', false, 20971520, array['image/jpeg','image/png','image/webp','application/pdf']),
  ('proof-of-delivery', 'proof-of-delivery', false, 10485760, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

-- Pharmacy owners may upload their own media/licensing under <pharmacyId>/...
create policy "storage: pharmacy owner upload media" on storage.objects for insert to authenticated
  with check (bucket_id in ('pharmacy-media', 'licensing') and public.owns_pharmacy((storage.foldername(name))[1]::uuid));
create policy "storage: pharmacy owner update media" on storage.objects for update to authenticated
  using (bucket_id in ('pharmacy-media', 'licensing') and public.owns_pharmacy((storage.foldername(name))[1]::uuid));
create policy "storage: pharmacy owner read media" on storage.objects for select to authenticated
  using (bucket_id in ('pharmacy-media', 'licensing') and public.owns_pharmacy((storage.foldername(name))[1]::uuid));
create policy "storage: admin read all" on storage.objects for select to authenticated
  using (public.is_admin() and bucket_id in ('licensing', 'pharmacy-media', 'driver-docs', 'proof-of-delivery'));
create policy "storage: admin write driver docs" on storage.objects for insert to authenticated
  with check (public.is_admin() and bucket_id = 'driver-docs');
-- Patient uploads (prescriptions/insurance/health cards) and proof-of-delivery
-- uploads are performed server-side with the service role after validation.

-- ---------------------------------------------------------------------
-- Driver projection: what a driver needs for pickup + delivery (patient
-- name/phone/address/notes + coordinates). No prescription, insurance or
-- health-card columns.
-- ---------------------------------------------------------------------
create view public.orders_driver
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
  st_y(p.location::geometry) as pharmacy_lat, st_x(p.location::geometry) as pharmacy_lng
from public.orders o
join public.pharmacies p on p.id = o.pharmacy_id;
