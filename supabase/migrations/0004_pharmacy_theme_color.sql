-- ---------------------------------------------------------------------
-- 0004 · Pharmacy theme colour
--
-- A pharmacy picks one colour during signup. Its public page derives the whole
-- palette from it (tints toward white, shades toward black, neutrals re-hued);
-- the rest of GetMed is unaffected. Stored as a plain #rrggbb so the app can
-- feed it straight to the colour maths. Null means "use the GetMed teal".
-- ---------------------------------------------------------------------

alter table public.pharmacies
  add column theme_color text
    constraint pharmacies_theme_color_hex check (theme_color ~ '^#[0-9a-f]{6}$');

-- Public page reads this view, so the colour has to travel with it. Columns can
-- only be appended here: `create or replace view` refuses a reorder or rename.
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
  theme_color
from public.pharmacies
where status = 'approved';
