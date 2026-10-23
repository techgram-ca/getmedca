-- ---------------------------------------------------------------------
-- Vaughan-area outreach contacts
--
-- 29 pharmacies gathered by hand, loaded into Tracking. Ten of them are
-- already on the list under the same address and are skipped; the other
-- nineteen are inserted with a fresh invite token each.
--
-- Nothing is overwritten and nothing is deleted. A contact already on the
-- list may have been emailed already, and its token is in that email — so
-- the worst this script can do on a second run is nothing.
--
-- Run it, then read the three reports it prints before sending anything:
--   1. what was skipped, and which existing contact it collided with
--   2. what went in
--   3. which inserted names resemble a name already on the list, and which
--      cities have no published rate card to link to
--
-- Both reports matter. The first is informational; the second two are
-- things to look at before a send goes out.
-- ---------------------------------------------------------------------

begin;

-- ---------------------------------------------------------------------
-- Tokens, generated the same way the app does
--
-- Twelve characters of a 57-character alphabet with the ambiguous glyphs
-- (0/O, 1/l/I) left out, drawn from gen_random_bytes with values above the
-- largest whole multiple of the alphabet rejected — so the early letters are
-- not very slightly likelier than the late ones. Matches
-- generateOutreachToken() in packages/core/src/outreach/index.ts.
--
-- In pg_temp, so it disappears with the session rather than leaving a
-- one-off helper behind in public.
-- ---------------------------------------------------------------------
create function pg_temp.outreach_token() returns text
language plpgsql as $$
declare
  alphabet constant text := 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  n constant int := length(alphabet);          -- 57
  limit_byte constant int := (256 / n) * n;    -- 228: anything above is redrawn
  candidate text;
  b int;
begin
  loop
    candidate := '';
    while length(candidate) < 12 loop
      b := get_byte(gen_random_bytes(1), 0);
      if b < limit_byte then
        candidate := candidate || substr(alphabet, 1 + (b % n), 1);
      end if;
    end loop;
    exit when not exists (select 1 from public.outreach_contacts where token = candidate);
  end loop;
  return candidate;
end $$;

-- ---------------------------------------------------------------------
-- The list as gathered
--
-- `name` is the trading name only. The banner (Pharmasave, I.D.A.,
-- Guardian, Remedy'sRx) and the address go in `notes`, because the name is
-- what [pharmacy-name] drops into the opening line of the pitch and
-- "I am getting in touch about Alpha Woodbridge Pharmacy — Pharmasave"
-- reads like a mail merge.
--
-- `city` is Vaughan throughout: Woodbridge, Concord, Maple and the
-- Thornhill addresses west of Yonge are all communities inside the City of
-- Vaughan, and the city is what [rates-link] turns into /delivery-rates/…,
-- so it has to match a rate card rather than a neighbourhood. Report 3
-- below checks that it does.
-- ---------------------------------------------------------------------
create temporary table incoming (
  row_no int,
  pharmacy_name text,
  contact_email text,
  city text,
  notes text
) on commit drop;

insert into incoming (row_no, pharmacy_name, contact_email, city, notes) values
  (1,  'Woodbridge Pharmacy',            'woodbridgepharmacy205@gmail.com',       'Vaughan', '205 Marycroft Ave., Unit 2, Woodbridge · 905-856-2221'),
  (2,  'Maplegate Pharmacy',             'maplegatepharmacy@gmail.com',           'Vaughan', '2200 Rutherford Rd., Concord · 905-417-7007'),
  (3,  'Alpha Woodbridge Pharmacy',      'alphawoodbridgepharmacy@gmail.com',     'Vaughan', 'Pharmasave · 5731 Hwy 7, Unit 15, Woodbridge · 905-264-8040'),
  (4,  'Innovation Pharmacy',            'innovation@carepharmacies.ca',          'Vaughan', 'I.D.A. · 40 Innovation Dr., Unit 4, Woodbridge · 905-856-5557'),
  (5,  'SelectHealth Pharmacy & Clinic', 'rx@selectpharmacy.ca',                  'Vaughan', '3981 Major Mackenzie Dr. W., Unit 20, Woodbridge · 905-417-4949'),
  (6,  'Pharma Centro',                  'pharmacentro20@gmail.com',              'Vaughan', '140 Woodbridge Ave., Woodbridge · 905-265-1265'),
  (7,  'Pine Valley Pharmacy',           'pinevalleypharmacy@gmail.com',          'Vaughan', '7700 Pine Valley Dr., Woodbridge · 905-851-2121'),
  (8,  'Bio Health Pharmacy',            'biohealthpharmacy@gmail.com',           'Vaughan', 'PharmaChoice · 2389 Major Mackenzie Dr., Maple · 905-303-3784'),
  (9,  'Sildom Drug Mart',               'sildomdrugmart@gmail.com',              'Vaughan', 'Remedy''sRx · 10555 Jane St., Maple · 905-417-1288'),
  (10, 'Hooper''s Pharmacy',             'vaughan@hoopershealth.com',             'Vaughan', '1410 Major Mackenzie Dr. W., Units C10-C11, Vaughan · 905-303-4466'),
  (11, 'HealthShield Pharmacy',          'Rutherford@healthshield.ca',            'Vaughan', 'Rutherford branch · 2640 Rutherford Rd., Unit 101 · 289-553-7701'),
  (12, 'Peace Medical Pharmacy',         'peacemedicalpharmacy@gmail.com',        'Vaughan', '9699 Jane St., Unit 19, Maple · 905-553-2244'),
  (13, 'Medipharm Plus Pharmacy',        'medipharmplus@yahoo.com',               'Vaughan', '2535 Major Mackenzie Dr. W., Unit 10, Maple · 905-417-3400'),
  (14, 'LMC Pharmacy',                   'vaughanpharmacy@lmc.ca',                'Vaughan', 'Vaughan branch · 1600 Steeles Ave. W., Unit 5, Concord · 289-807-1961'),
  (15, 'Venice Pharmacy',                'pharmacy.venice@yahoo.com',             'Vaughan', '3530 Rutherford Rd., Woodbridge · 905-553-7546'),
  (16, 'Mackenzie Pharmacy',             'idamackenziepharmacy@yahoo.com',        'Vaughan', 'I.D.A. · 9671 Jane St., Unit 2, Maple · 905-553-5553'),
  (17, 'Main Exchange Pharmacy',         'pharmacymain407@gmail.com',             'Vaughan', 'Guardian · 800 Steeles Ave. W., Unit 8B, Thornhill · 905-761-3345'),
  (18, 'Thornhill Pharmacy',             'thornhill@princerx.ca',                 'Vaughan', 'PrinceRx · 390 Steeles Ave. W., Unit 2, Thornhill · 647-955-5057'),
  -- 8100 Yonge straddles the Vaughan/Markham line, which is Yonge St itself.
  -- Confirm before a rate-card link goes out: the price could be Markham's.
  (19, 'Royal Compounding Pharmacy',     'royalpharmacy1@gmail.com',              'Vaughan', 'CHECK CITY: 8100 Yonge St., Unit 1A, Thornhill (Vaughan/Markham boundary) · 905-889-1588'),
  (20, 'Townsgate Pharmacy',             'towns7077@gmail.com',                   'Vaughan', 'Guardian · 7077 Bathurst St., Unit 2, Thornhill · 905-709-2285'),
  (21, 'Disera Medical Pharmacy',        'diseramedicalpharmacy@gmail.com',       'Vaughan', '30 Disera Dr., Unit 100, Thornhill · 905-882-0404'),
  (22, 'Concord Specialty Pharmacy',     'pharmacy@concordsp.ca',                 'Vaughan', '2180 Steeles Ave. W., Unit 4, Concord · 905-738-5155'),
  (23, 'Samy''s Drug Mart',              'samysdrugmart2025@gmail.com',           'Vaughan', 'I.D.A. · 1600 Steeles Ave. W., Unit 19, Concord · 905-669-8177'),
  (24, 'iHealth Centre Pharmacy',        'ihealthcentrepharmacy@gmail.com',       'Vaughan', '6175 Hwy 7, Unit 6, Woodbridge · 416-639-6293'),
  (25, 'Teston Pharmacy',                'testonmedicalcenterpharmacy@gmail.com', 'Vaughan', '270 Purple Creek Rd., Woodbridge · 905-417-2059'),
  (26, 'York Major Pharmacy',            'yorkmajorpharmacy@gmail.com',           'Vaughan', '191 McNaughton Rd. E., Unit 106, Vaughan · 905-417-9000'),
  (27, 'HealthShield Pharmacy',          'jane@healthshield.ca',                  'Vaughan', 'Jane branch · 9401 Jane St., Unit 122, Vaughan · 905-832-4333'),
  (28, 'Lily Pharmacy',                  'lily.pharmacy.rx@gmail.com',            'Vaughan', '3175 Rutherford Rd., Unit 23, Vaughan · 905-738-6308'),
  (29, 'Procare Pharmacy',               'procaremack@gmail.com',                 'Vaughan', 'Maple branch · 955 Major Mackenzie Dr. W., Unit 100, Maple · 289-553-7700');

-- ---------------------------------------------------------------------
-- Report 1 · skipped, because the address is already on the list
--
-- Matched the way the unique index does: lowercased and trimmed. Nothing
-- about the existing row is touched — it may already have been emailed, and
-- its token is in that email.
-- ---------------------------------------------------------------------
select
  i.row_no                as "#",
  i.pharmacy_name         as "gathered as",
  i.contact_email         as "email",
  c.pharmacy_name         as "already on the list as",
  coalesce(to_char(c.sent_at, 'YYYY-MM-DD'), 'not sent') as "already emailed"
from incoming i
join public.outreach_contacts c
  on lower(trim(c.contact_email)) = lower(trim(i.contact_email))
order by i.row_no;

-- ---------------------------------------------------------------------
-- Report 2 · what went in
-- ---------------------------------------------------------------------
-- Which rows were inserted is recorded rather than re-derived. Working it
-- out afterwards by "is this email in the incoming list" gets it wrong for
-- exactly the rows that matter: an existing contact whose address is also in
-- the list would be counted as new, and so would never be offered as the
-- thing a new row collides with.
create temporary table inserted_rows (
  id uuid, pharmacy_name text, contact_email text, city text, token text
) on commit drop;

with ins as (
  insert into public.outreach_contacts (token, pharmacy_name, contact_email, city, notes)
  select pg_temp.outreach_token(), i.pharmacy_name, i.contact_email, i.city, i.notes
  from incoming i
  where not exists (
    select 1 from public.outreach_contacts c
    where lower(trim(c.contact_email)) = lower(trim(i.contact_email))
  )
  returning id, pharmacy_name, contact_email, city, token
)
insert into inserted_rows select id, pharmacy_name, contact_email, city, token from ins;

select pharmacy_name as "inserted", contact_email as "email", city, token
from inserted_rows
order by pharmacy_name;

-- ---------------------------------------------------------------------
-- Report 3a · names worth a second look
--
-- A different address under a name already on the list is usually a second
-- branch, which is fine and wanted — but it is also what a typo'd address
-- looks like, and the two are told apart by a person, not by a script. So
-- these are reported rather than skipped.
--
-- Matched two ways: one normalised name containing the other, and a shared
-- distinctive word. Generic words are ignored or every pharmacy matches
-- every other pharmacy.
-- ---------------------------------------------------------------------
create temporary view normalised as
with stop as (
  select array[
    'pharmacy','pharmacies','drug','mart','drugmart','the','and','clinic',
    'centre','center','medical','health','compounding','plus','rx','ida',
    'guardian','pharmasave','pharmachoice','remedysrx','princerx','specialty',
    'vaughan','maple','concord','woodbridge','thornhill','bolton','york'
  ] as words
)
select
  n.id,
  n.pharmacy_name,
  n.contact_email,
  n.source,
  -- Letters and digits only, so "Hooper's" and "Hoopers" are one name.
  regexp_replace(lower(n.pharmacy_name), '[^a-z0-9]', '', 'g') as squashed,
  (
    select array_agg(w)
    from unnest(regexp_split_to_array(regexp_replace(lower(n.pharmacy_name), '[^a-z0-9 ]', ' ', 'g'), '\s+')) as w
    cross join stop
    where length(w) >= 4 and not (w = any(stop.words))
  ) as keywords
from (
  select r.id, r.pharmacy_name, r.contact_email, 'inserted' as source
  from inserted_rows r
  union all
  select c.id, c.pharmacy_name, c.contact_email, 'already there' as source
  from public.outreach_contacts c
  where not exists (select 1 from inserted_rows r where r.id = c.id)
) n;

select
  a.pharmacy_name  as "inserted",
  a.contact_email  as "its email",
  b.pharmacy_name  as "looks like",
  b.contact_email  as "which emails",
  case
    when a.squashed like '%' || b.squashed || '%' or b.squashed like '%' || a.squashed || '%'
      then 'one name contains the other'
    else 'shared word: ' || array_to_string(array(select unnest(a.keywords) intersect select unnest(b.keywords)), ', ')
  end as "why"
from normalised a
join normalised b
  on b.source = 'already there'
 and a.id <> b.id
 and (
   a.squashed like '%' || b.squashed || '%'
   or b.squashed like '%' || a.squashed || '%'
   or (a.keywords && b.keywords)
 )
where a.source = 'inserted'
order by a.pharmacy_name;

-- ---------------------------------------------------------------------
-- Report 3b · cities with no rate card to link to
--
-- [rates-link] becomes /delivery-rates/<slugified city>. A city with no
-- published card there is a live link to a 404 inside a pitch email, which
-- is worse than no link at all.
-- ---------------------------------------------------------------------
select
  i.city                                  as "city used",
  count(*)                                as "contacts",
  'no published rate card — /delivery-rates/'
    || lower(regexp_replace(trim(i.city), '[^a-zA-Z0-9]+', '-', 'g'))
    || ' would 404'                       as "problem"
from incoming i
where not exists (
  select 1 from public.delivery_rate_cards r
  where r.published
    and lower(r.slug) = lower(regexp_replace(trim(i.city), '[^a-zA-Z0-9]+', '-', 'g'))
)
group by i.city;

commit;
