-- ---------------------------------------------------------------------
-- 0021 · Approved, but not listed
--
-- `status` says where a pharmacy sits in the approval lifecycle: pending,
-- approved, inactive. Whether patients can find it is a different question,
-- and a fourth status would have answered both at once. Every
-- `status = 'approved'` check — the public view, the pharmacists and services
-- read policies, `pharmacy_is_approved`, the pharmacy's own dashboard gate,
-- the order and consultation APIs — would have had to learn the new value,
-- and the ones missed would quietly lock a pharmacy out of its own account.
--
-- So it is a flag on its own axis. `listed = false` leaves the pharmacy
-- approved, signed in and working exactly as before; it only stops patients
-- arriving. The demo pharmacy is why this exists: a real-looking page to show
-- a prospect what they would get, which no patient should ever stumble into
-- and try to order from.
-- ---------------------------------------------------------------------

alter table public.pharmacies
  add column if not exists listed boolean not null default true;

comment on column public.pharmacies.listed is
  'False keeps an approved pharmacy out of search and turns its public page into a preview with ordering disabled. Its dashboard is unaffected.';

-- The public page reads this view, so the flag has to travel with it: the page
-- is still served for an unlisted pharmacy, just in preview. Columns can only
-- be appended here — `create or replace view` refuses a reorder or rename.
create or replace view public.pharmacies_public
with (security_invoker = false)
as
select
  id, slug, name, phone, address_line, city, province, postal_code,
  st_y(location::geometry) as lat, st_x(location::geometry) as lng,
  hours, delivery_radius_km, estimated_delivery_time,
  offers_delivery, offers_transfer, offers_consultation,
  accepted_insurance, accessibility_notes,
  logo_path, cover_path, tagline, bio, gallery_paths,
  theme_color,
  listed
from public.pharmacies
where status = 'approved';

-- Search is the one place the flag actually hides something. Everything else
-- about an unlisted pharmacy stays reachable by its own URL.
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
    and p.listed
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

-- The demo pharmacy exists to be shown to prospects, never to be ordered
-- from. Matching on the slug rather than an id because the row is created per
-- environment; a database without one is left alone.
update public.pharmacies
set listed = false
where slug = 'demo-pharmacy' or slug like 'demo-pharmacy-%';
