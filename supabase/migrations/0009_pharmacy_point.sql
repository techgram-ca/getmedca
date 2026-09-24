-- ---------------------------------------------------------------------
-- 0009 · A pharmacy's coordinates, for quoting an address before an order
--
-- The manual order form shows a pharmacy what a delivery will cost as soon as
-- it picks the address, which needs the driving distance from the pharmacy —
-- before any order row exists for order_route_points to read.
--
-- PostgREST returns geography columns as WKB hex rather than coordinates, so
-- this reads them through st_x/st_y, the same way pharmacies_near and
-- order_route_points do.
-- ---------------------------------------------------------------------
create or replace function public.pharmacy_point(p_pharmacy_id uuid)
returns table (lat double precision, lng double precision)
language sql stable security definer set search_path = public
as $$
  select st_y(p.location::geometry), st_x(p.location::geometry)
  from public.pharmacies p
  where p.id = p_pharmacy_id and p.location is not null;
$$;
