-- ---------------------------------------------------------------------
-- 0025 · The nearest N, rather than everything inside a radius
--
-- A radius answers the wrong question. Set it at 10 km and a patient in a
-- dense part of Vaughan gets thirty pharmacies while one twenty minutes
-- north gets none — same setting, opposite failures. What a patient wants
-- is a short list of the closest ones, and what the admin wants to set is
-- how long that list is.
--
-- So `search_result_limit` is a count: ten means the ten nearest, or fewer
-- if fewer exist. `search_radius_km` stops being read; it is left in place
-- rather than dropped because `seed.sql` is frozen and writes to it.
--
-- A bound still exists, but it is a guard rather than a setting — without
-- one, an address in Thunder Bay would be offered the nearest Toronto
-- pharmacy with a 1,400 km driving distance printed beside it. It lives in
-- the caller, where the number can be explained.
-- ---------------------------------------------------------------------

alter table public.platform_settings
  add column if not exists search_result_limit int not null default 10
    check (search_result_limit between 1 and 50);

comment on column public.platform_settings.search_result_limit is
  'How many of the nearest pharmacies patient search returns. Fewer if fewer exist.';

comment on column public.platform_settings.search_radius_km is
  'No longer read. Superseded by search_result_limit in 0025; kept because seed.sql is frozen.';

-- ---------------------------------------------------------------------
-- `pharmacies_near` takes a count
--
-- Dropped and recreated rather than replaced: changing the argument list
-- would add an overload beside the old function, and the old one would keep
-- answering anything that still called it with the old arguments.
--
-- It returns more than asked for, because the ordering here is straight-line
-- and the ordering the patient sees is by road. The pharmacy across the
-- valley is closer as the crow flies and further to drive, so the caller
-- needs candidates to reorder before it cuts the list to length.
-- ---------------------------------------------------------------------
drop function if exists public.pharmacies_near(double precision, double precision, double precision, text);

create or replace function public.pharmacies_near(
  p_lat double precision,
  p_lng double precision,
  p_radius_m double precision,
  p_limit int default 20,
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
  limit greatest(p_limit, 1);
$$;
