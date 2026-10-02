-- ---------------------------------------------------------------------
-- DEMO DATA — nine Bolton / Caledon East pharmacies, for showing people
-- what their public page would look like.
--
-- NOT a migration. Nothing here belongs in production: run it against the
-- dev/QA database only. supabase/demo/remove-bolton-pharmacies.sql undoes it.
--
-- No auth users and no accounts. owner_user_id stays null, which the schema
-- allows, so these pages exist without anyone being able to sign in as them.
--
-- The business names are real. Everything else — street addresses, phone
-- numbers, hours, staff, prices, taglines — is invented placeholder content.
-- The phone numbers use the 555 range reserved for fiction so that nobody
-- demoing this can call a real pharmacy by accident. Replace the lot before
-- showing it to the pharmacies themselves if you want it to read as real.
--
-- Images: logo_path and cover_path are deliberately null. The app already
-- falls back to the pharmacy's initials on a brand-tinted circle (Avatar in
-- packages/ui) and to /images/pharmacy.png for the storefront, so the pages
-- look complete with nothing uploaded to storage.
--
-- Re-running is safe: pharmacies upsert on their slug, and the child rows are
-- cleared and rebuilt rather than duplicated.
-- ---------------------------------------------------------------------

begin;

insert into public.pharmacies (
  slug, status, name, email, phone, address_line, city, province, postal_code, location,
  license_number, license_province, license_college, pic_name,
  hours, delivery_radius_km, estimated_delivery_time,
  offers_delivery, offers_transfer, offers_consultation,
  accepted_insurance, accessibility_notes,
  tagline, bio, theme_color,
  signup_step, submitted_at, approved_at
) values
  (
    'guardian-leggett-smith-pharmacy-l7e1c1', 'approved',
    'Guardian - Leggett & Smith Pharmacy', 'hello@example.invalid', '905-555-0101',
    '18 King Street West', 'Bolton', 'ON', 'L7E 1C1', 'SRID=4326;POINT(-79.7390 43.8760)',
    'DEMO-1001', 'ON', 'Ontario College of Pharmacists', 'A. Leggett',
    '{"mon":{"open":"09:00","close":"19:00"},"tue":{"open":"09:00","close":"19:00"},"wed":{"open":"09:00","close":"19:00"},"thu":{"open":"09:00","close":"19:00"},"fri":{"open":"09:00","close":"19:00"},"sat":{"open":"09:00","close":"17:00"},"sun":{"closed":true}}'::jsonb,
    12, 'Same day, usually within 3 hours', true, true, true,
    array['ODB', 'Green Shield', 'Manulife', 'Sun Life'],
    'Street-level entrance with automatic doors. Accessible washroom on site.',
    'Your neighbourhood pharmacy on King Street since 1978',
    'A family-run pharmacy in the heart of Bolton. Our pharmacists know their patients by name, and we take the time to answer the question behind the question — whether that is a new prescription, a medication review, or simply what to take for a cough that will not shift.',
    '#0f766e', 7, now(), now()
  ),
  (
    'dayspring-pharmacy-l7e2e3', 'approved',
    'Dayspring Pharmacy', 'hello@example.invalid', '905-555-0102',
    '274 Queen Street South, Unit 4', 'Bolton', 'ON', 'L7E 2E3', 'SRID=4326;POINT(-79.7348 43.8702)',
    'DEMO-1002', 'ON', 'Ontario College of Pharmacists', 'M. Osei',
    '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"20:00"},"fri":{"open":"09:00","close":"18:00"},"sat":{"open":"10:00","close":"16:00"},"sun":{"closed":true}}'::jsonb,
    10, 'Same day before 4pm', true, true, true,
    array['ODB', 'Green Shield', 'Canada Life'],
    'Ground floor unit, step-free from the parking lot.',
    'Unhurried advice, every time you come in',
    'Dayspring is a small independent pharmacy, and that is the point. There is no queue to get to a pharmacist, no automated line to navigate, and no charge for asking. We fill prescriptions, review the ones you already take, and keep an eye on how they work together.',
    '#2563eb', 7, now(), now()
  ),
  (
    'pharmasave-bolton-pharmacy-l7e1e8', 'approved',
    'Pharmasave Bolton Pharmacy', 'hello@example.invalid', '905-555-0103',
    '12 Queen Street North', 'Bolton', 'ON', 'L7E 1E8', 'SRID=4326;POINT(-79.7375 43.8783)',
    'DEMO-1003', 'ON', 'Ontario College of Pharmacists', 'R. Virk',
    '{"mon":{"open":"08:30","close":"20:00"},"tue":{"open":"08:30","close":"20:00"},"wed":{"open":"08:30","close":"20:00"},"thu":{"open":"08:30","close":"20:00"},"fri":{"open":"08:30","close":"20:00"},"sat":{"open":"09:00","close":"18:00"},"sun":{"open":"10:00","close":"16:00"}}'::jsonb,
    15, 'Same day, seven days a week', true, true, true,
    array['ODB', 'Green Shield', 'Manulife', 'Sun Life', 'Desjardins'],
    'Wheelchair accessible. Parking directly outside.',
    'Open seven days, including Sunday afternoons',
    'A full-service community pharmacy with the longest hours in Bolton. Vaccinations without an appointment, blister packing for complex regimens, and a pharmacist on the floor every hour we are open.',
    '#16a34a', 7, now(), now()
  ),
  (
    'bolton-compounding-specialists-and-ida-pharmacy-l7e4e4', 'approved',
    'Bolton Compounding specialists and IDA pharmacy', 'hello@example.invalid', '905-555-0104',
    '60 Healey Road, Unit 2', 'Bolton', 'ON', 'L7E 4E4', 'SRID=4326;POINT(-79.7291 43.8658)',
    'DEMO-1004', 'ON', 'Ontario College of Pharmacists', 'S. Nguyen',
    '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"18:00"},"fri":{"open":"09:00","close":"17:00"},"sat":{"open":"10:00","close":"14:00"},"sun":{"closed":true}}'::jsonb,
    20, 'Next day for compounded preparations', true, true, true,
    array['ODB', 'Green Shield', 'Manulife'],
    'Accessible entrance at the rear of the unit.',
    'Compounding for the prescriptions nobody else can fill',
    'We prepare medication that does not come off a shelf: paediatric doses, allergen-free formulations, veterinary preparations and hormone therapy made to a prescriber''s specification. Our compounding lab is on site, so most preparations are ready the next working day.',
    '#7c3aed', 7, now(), now()
  ),
  (
    'bolton-health-pharmacy-l7e5t3', 'approved',
    'Bolton Health Pharmacy', 'hello@example.invalid', '905-555-0105',
    '150 McEwan Drive East, Unit 7', 'Bolton', 'ON', 'L7E 5T3', 'SRID=4326;POINT(-79.7233 43.8695)',
    'DEMO-1005', 'ON', 'Ontario College of Pharmacists', 'K. Haddad',
    '{"mon":{"open":"09:00","close":"19:00"},"tue":{"open":"09:00","close":"19:00"},"wed":{"open":"09:00","close":"19:00"},"thu":{"open":"09:00","close":"19:00"},"fri":{"open":"09:00","close":"19:00"},"sat":{"open":"09:00","close":"16:00"},"sun":{"closed":true}}'::jsonb,
    12, 'Same day before 5pm', true, true, true,
    array['ODB', 'Green Shield', 'Sun Life'],
    'Step-free access throughout.',
    'Chronic condition care, close to home',
    'We work with patients managing diabetes, blood pressure and cholesterol over the long term — regular reviews, device training, and a pharmacist who remembers what changed last time. Delivery across Bolton and the surrounding concessions.',
    '#0891b2', 7, now(), now()
  ),
  (
    'life-pharmacy-l7e1g1', 'approved',
    'Life Pharmacy', 'hello@example.invalid', '905-555-0106',
    '30 Queen Street North', 'Bolton', 'ON', 'L7E 1G1', 'SRID=4326;POINT(-79.7368 43.8791)',
    'DEMO-1006', 'ON', 'Ontario College of Pharmacists', 'J. Marchetti',
    '{"mon":{"open":"09:30","close":"18:30"},"tue":{"open":"09:30","close":"18:30"},"wed":{"open":"09:30","close":"18:30"},"thu":{"open":"09:30","close":"18:30"},"fri":{"open":"09:30","close":"18:30"},"sat":{"open":"10:00","close":"15:00"},"sun":{"closed":true}}'::jsonb,
    8, 'Same day within Bolton', true, true, true,
    array['ODB', 'Green Shield'],
    'One step at the entrance; ring the bell and a staff member will assist.',
    'Small pharmacy, short queues, straight answers',
    'Life Pharmacy has been on Queen Street for eleven years. We are small enough that you will speak to the same pharmacist each visit, and we would rather spend five minutes explaining a medication than hand it over without a word.',
    '#be185d', 7, now(), now()
  ),
  (
    'bolton-compounding-pharmacy-l7e2c5', 'approved',
    'Bolton Compounding Pharmacy', 'hello@example.invalid', '905-555-0107',
    '302 Queen Street South, Unit 11', 'Bolton', 'ON', 'L7E 2C5', 'SRID=4326;POINT(-79.7339 43.8681)',
    'DEMO-1007', 'ON', 'Ontario College of Pharmacists', 'P. Ramanathan',
    '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"18:00"},"fri":{"open":"09:00","close":"18:00"},"sat":{"closed":true},"sun":{"closed":true}}'::jsonb,
    18, 'Next day for compounded preparations', true, true, true,
    array['ODB', 'Manulife', 'Canada Life'],
    'Accessible parking bay directly outside the unit.',
    'Made to the prescription, not to the shelf',
    'Custom preparations for patients who cannot take a standard dose or formulation — liquids for children, creams without common allergens, and strengths that are simply not manufactured. Prescribers are welcome to call the lab directly.',
    '#ca8a04', 7, now(), now()
  ),
  (
    'parr-pharmacy-l7e1m5', 'approved',
    'Parr Pharmacy', 'hello@example.invalid', '905-555-0108',
    '55 Sterne Street', 'Bolton', 'ON', 'L7E 1M5', 'SRID=4326;POINT(-79.7412 43.8744)',
    'DEMO-1008', 'ON', 'Ontario College of Pharmacists', 'D. Parr',
    '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"18:00"},"fri":{"open":"09:00","close":"18:00"},"sat":{"open":"09:00","close":"13:00"},"sun":{"closed":true}}'::jsonb,
    10, 'Same day before 3pm', true, true, true,
    array['ODB', 'Green Shield', 'Sun Life'],
    'Level entry from the street.',
    'The pharmacy your family has used for three generations',
    'Parr Pharmacy has served the same streets since the 1960s. Prescriptions, blister packs, and the kind of advice that comes from knowing a family over decades. Free delivery across Bolton for patients over 65.',
    '#475569', 7, now(), now()
  ),
  (
    'guardian-caledon-east-pharmacy-l7c1h8', 'approved',
    'Guardian CALEDON EAST PHARMACY', 'hello@example.invalid', '905-555-0109',
    '15930 Airport Road, Unit 3', 'Caledon East', 'ON', 'L7C 1H8', 'SRID=4326;POINT(-79.8710 43.8690)',
    'DEMO-1009', 'ON', 'Ontario College of Pharmacists', 'L. Fitzgerald',
    '{"mon":{"open":"09:00","close":"18:00"},"tue":{"open":"09:00","close":"18:00"},"wed":{"open":"09:00","close":"18:00"},"thu":{"open":"09:00","close":"18:00"},"fri":{"open":"09:00","close":"18:00"},"sat":{"open":"09:00","close":"14:00"},"sun":{"closed":true}}'::jsonb,
    25, 'Same day across Caledon', true, true, true,
    array['ODB', 'Green Shield', 'Manulife', 'Sun Life'],
    'Accessible entrance and parking.',
    'Serving Caledon East and the villages around it',
    'The only pharmacy in Caledon East, and we take that seriously. We deliver out to the rural concessions where the nearest alternative is a half-hour drive, and we will always take a phone call from a patient who is not sure whether something is worth coming in for.',
    '#ea580c', 7, now(), now()
  )
on conflict (slug) do update set
  status = excluded.status,
  name = excluded.name,
  phone = excluded.phone,
  address_line = excluded.address_line,
  city = excluded.city,
  postal_code = excluded.postal_code,
  location = excluded.location,
  hours = excluded.hours,
  delivery_radius_km = excluded.delivery_radius_km,
  estimated_delivery_time = excluded.estimated_delivery_time,
  accepted_insurance = excluded.accepted_insurance,
  accessibility_notes = excluded.accessibility_notes,
  tagline = excluded.tagline,
  bio = excluded.bio,
  theme_color = excluded.theme_color,
  approved_at = excluded.approved_at,
  updated_at = now();

-- Child rows have no natural key, so they are rebuilt rather than merged.
-- Scoped to these nine by license number, which nothing else uses.
create temporary table demo_pharmacies on commit drop as
  select id, slug, name from public.pharmacies where license_number like 'DEMO-10%';

delete from public.pharmacists where pharmacy_id in (select id from demo_pharmacies);
delete from public.pharmacy_services where pharmacy_id in (select id from demo_pharmacies);
delete from public.pharmacy_issues where pharmacy_id in (select id from demo_pharmacies);
delete from public.pharmacy_zone_areas where pharmacy_id in (select id from demo_pharmacies);

-- One named pharmacist per pharmacy, plus a second for the larger ones, so the
-- staff section has something to show. Photos are null: the page renders the
-- pharmacist's initials, same as the logo.
insert into public.pharmacists (pharmacy_id, name, credentials, years_experience, bio, languages, is_main, sort_order)
select d.id, v.name, v.credentials, v.years, v.bio, v.languages, v.is_main, v.sort_order
from demo_pharmacies d
join (values
  ('guardian-leggett-smith-pharmacy-l7e1c1', 'Alison Leggett', 'BScPhm, RPh', 22, 'Alison has run the dispensary on King Street for two decades and still does the Saturday shift herself.', array['English','Italian'], true, 0),
  ('guardian-leggett-smith-pharmacy-l7e1c1', 'Tomas Silva', 'PharmD, RPh', 7, 'Tomas looks after medication reviews and the pharmacy''s vaccination clinics.', array['English','Portuguese','Spanish'], false, 1),
  ('dayspring-pharmacy-l7e2e3', 'Michael Osei', 'PharmD, RPh', 11, 'Michael opened Dayspring after a decade in hospital pharmacy, and brought the habit of explaining everything twice.', array['English','Twi','French'], true, 0),
  ('pharmasave-bolton-pharmacy-l7e1e8', 'Rajan Virk', 'BScPhm, RPh, CDE', 16, 'Rajan is a certified diabetes educator and runs the pharmacy''s walk-in vaccination service.', array['English','Punjabi','Hindi'], true, 0),
  ('pharmasave-bolton-pharmacy-l7e1e8', 'Grace Lam', 'PharmD, RPh', 5, 'Grace handles blister packing and works with patients on complex medication schedules.', array['English','Cantonese','Mandarin'], false, 1),
  ('bolton-compounding-specialists-and-ida-pharmacy-l7e4e4', 'Sophie Nguyen', 'BScPhm, RPh', 14, 'Sophie trained in sterile and non-sterile compounding and supervises every preparation that leaves the lab.', array['English','Vietnamese','French'], true, 0),
  ('bolton-health-pharmacy-l7e5t3', 'Karim Haddad', 'PharmD, RPh, CDE', 13, 'Karim works with patients managing diabetes and hypertension over the long term.', array['English','Arabic','French'], true, 0),
  ('life-pharmacy-l7e1g1', 'Julia Marchetti', 'BScPhm, RPh', 19, 'Julia has been behind the counter on Queen Street for eleven years and knows most of the street by name.', array['English','Italian'], true, 0),
  ('bolton-compounding-pharmacy-l7e2c5', 'Priya Ramanathan', 'PharmD, RPh', 10, 'Priya specialises in paediatric and allergen-free formulations and takes prescriber calls directly.', array['English','Tamil','Hindi'], true, 0),
  ('parr-pharmacy-l7e1m5', 'David Parr', 'BScPhm, RPh', 28, 'David is the third generation of his family to run the pharmacy on Sterne Street.', array['English'], true, 0),
  ('guardian-caledon-east-pharmacy-l7c1h8', 'Laura Fitzgerald', 'PharmD, RPh', 9, 'Laura covers Caledon East and the rural routes around it, and does the deliveries herself when it is quiet.', array['English','French'], true, 0)
) as v(slug, name, credentials, years, bio, languages, is_main, sort_order)
  on v.slug = d.slug;

-- Services, priced so the page shows a mix of free and paid.
insert into public.pharmacy_services (pharmacy_id, name, description, price, duration_minutes, sort_order)
select d.id, v.name, v.description, v.price, v.minutes, v.sort_order
from demo_pharmacies d
cross join (values
  ('Prescription delivery', 'Delivered to your door by a GetMed driver, tracked the whole way.', null::numeric, null::int, 0),
  ('Medication review', 'A pharmacist goes through everything you take, in one sitting.', null::numeric, 30, 1),
  ('Vaccinations', 'Flu, COVID-19, shingles, travel and routine immunisations.', 25.00, 15, 2),
  ('Blister packing', 'Your week sorted into dated compartments, collected or delivered.', null::numeric, null::int, 3),
  ('Prescription transfer', 'We contact your current pharmacy and move your file across.', null::numeric, null::int, 4)
) as v(name, description, price, minutes, sort_order);

-- Consultation topics. Every pharmacy offers the common ones; the compounding
-- pharmacies skip the walk-in ailments they would not treat.
insert into public.pharmacy_issues (pharmacy_id, issue_id, price)
select d.id, i.id,
  case i.slug
    when 'medication-review' then null
    when 'vaccinations' then 25.00
    when 'uti' then 35.00
    when 'pink-eye' then 35.00
    when 'birth-control' then 30.00
    when 'travel-health' then 40.00
    else 20.00
  end
from demo_pharmacies d
join public.issues i on i.active
where i.slug in (
  'cold-flu', 'allergies', 'skin-conditions', 'uti', 'pink-eye',
  'medication-review', 'smoking-cessation', 'birth-control',
  'travel-health', 'diabetes', 'blood-pressure', 'vaccinations'
)
  and not (d.slug like 'bolton-compounding%' and i.slug in ('cold-flu', 'pink-eye', 'uti'));

-- Delivery zones.
--
-- Without these every delivery falls to Zone 5 and prices per kilometre, which
-- is the fallback for an area a pharmacy has not told us about — not what a
-- working pharmacy looks like. Tagging the postal areas around Bolton means a
-- demo order to a Bolton address quotes a fixed Zone 1 price, the way it would
-- in production.
--
-- Every FSA below is already in postal_areas (seeded with the GTA and Hamilton),
-- so these join rather than invent anything. Zone 5 is never tagged: it is what
-- an untagged postal code falls to.
insert into public.pharmacy_zone_areas (pharmacy_id, fsa, zone)
select d.id, v.fsa, v.zone::public.delivery_zone
from demo_pharmacies d
join (values
  -- Bolton pharmacies, working outwards from their own postal area.
  ('bolton', 'L7E', 'zone1'),                                   -- Bolton itself
  ('bolton', 'L7C', 'zone2'), ('bolton', 'L6P', 'zone2'), ('bolton', 'L4H', 'zone2'),
  ('bolton', 'L7K', 'zone3'), ('bolton', 'L6Z', 'zone3'), ('bolton', 'L6R', 'zone3'),
  ('bolton', 'L7A', 'zone3'), ('bolton', 'L4L', 'zone3'),
  ('bolton', 'L6S', 'zone4'), ('bolton', 'L6T', 'zone4'), ('bolton', 'L6V', 'zone4'),
  ('bolton', 'L6W', 'zone4'), ('bolton', 'L6X', 'zone4'), ('bolton', 'L6Y', 'zone4'),
  ('bolton', 'L4K', 'zone4'), ('bolton', 'L4J', 'zone4'), ('bolton', 'L7B', 'zone4'),
  ('bolton', 'L7G', 'zone4'),
  -- Caledon East sits further west, so the same places fall differently.
  ('caledon', 'L7C', 'zone1'),
  ('caledon', 'L7E', 'zone2'), ('caledon', 'L7K', 'zone2'),
  ('caledon', 'L6P', 'zone3'), ('caledon', 'L7A', 'zone3'), ('caledon', 'L6Z', 'zone3'),
  ('caledon', 'L7B', 'zone3'),
  ('caledon', 'L6R', 'zone4'), ('caledon', 'L6S', 'zone4'), ('caledon', 'L4H', 'zone4'),
  ('caledon', 'L7G', 'zone4')
) as v(area, fsa, zone)
  on v.area = case when d.slug like '%-l7c%' then 'caledon' else 'bolton' end
join public.postal_areas pa on pa.fsa = v.fsa
on conflict (pharmacy_id, fsa) do update set zone = excluded.zone;

commit;

-- What you just created.
select p.slug, p.name, p.city, p.postal_code,
  (select count(*) from public.pharmacists s where s.pharmacy_id = p.id) as pharmacists,
  (select count(*) from public.pharmacy_services s where s.pharmacy_id = p.id) as services,
  (select count(*) from public.pharmacy_issues s where s.pharmacy_id = p.id) as topics,
  (select count(*) from public.pharmacy_zone_areas s where s.pharmacy_id = p.id) as zone_areas
from public.pharmacies p
where p.license_number like 'DEMO-10%'
order by p.city, p.name;
