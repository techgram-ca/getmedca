-- ---------------------------------------------------------------------
-- Mississauga outreach contacts
--
-- 50 pharmacies gathered by hand, loaded into Tracking. Names only: the
-- banner (Guardian, I.D.A., PrinceRx, PharmaChoice) and the street address
-- were dropped on the way in, because [pharmacy-name] opens the pitch and
-- "I am getting in touch about Bristol Pharmacy - 512 Bristol Rd. W."
-- reads like a mail merge. City is Mississauga throughout.
--
-- Nothing is overwritten and nothing is deleted. A contact already on the
-- list may have been emailed already, and its token is in that email, so
-- the worst this script can do on a second run is nothing.
--
-- None of these fifty collided with the list when this was written, but the
-- check runs anyway: the list has grown twice already, and a duplicate
-- address splits one pharmacy's history across two tokens.
--
-- Read the reports before sending anything:
--   1. what was skipped, and which existing contact it collided with
--   2. what went in
--   3. inserted names that resemble a name already on the list, and any
--      city with no published rate card to link to
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
-- ---------------------------------------------------------------------
create temporary table incoming (
  row_no int,
  pharmacy_name text,
  contact_email text,
  city text,
  notes text
) on commit drop;

-- City is the same for every row and there are no addresses to keep, so the
-- list stays two columns wide and readable.
insert into incoming (row_no, pharmacy_name, contact_email, city, notes)
select v.row_no, v.pharmacy_name, v.contact_email, 'Mississauga', null
from (values
  ( 1, 'Marketplace Pharmacy',                            'mpswl@yahoo.com'),
  ( 2, 'Pearl Pharmacy',                                  'pearlpharmacy7@gmail.com'),
  ( 3, 'King Medical Arts Pharmacy and Home Healthcare',  'kingmedarts@gmail.com'),
  ( 4, 'Medical Building Pharmacy',                       'medbldpharm@gmail.com'),
  ( 5, 'Central Parkway Pharmacy',                        'info@centralparkwaypharmacy.ca'),
  ( 6, 'Queensway Pharmacy',                              '101queenswayph@gmail.com'),
  ( 7, 'Heritage Hills Pharmacy',                         'heritagehillspharmacy@gmail.com'),
  ( 8, 'Erin Centre Pharmacy',                            'erincentrepharmacy@gmail.com'),
  ( 9, 'Whole Health Pharmacy Erin Mills',                'erinmillswhp@gmail.com'),
  (10, 'Living Arts Pharmacy',                            'livingarts@princerx.ca'),
  (11, 'Sheridan Pharmacy',                               'sheridanpharmacy.email@gmail.com'),
  (12, 'Carl''s Pharmacy',                                'carlspharmacyRX@gmail.com'),
  (13, 'Affirming Care Pharmacy',                         'ontariosupport@affirmingcare.ca'),
  (14, 'eMichael Pharmacy',                               'rx@emichael.ca'),
  (15, 'Tenth Eglinton Pharmacy',                         'tenthlinepharmacy@gmail.com'),
  (16, 'Meadowvale Pharmacy',                             'meadowvalepharmacy@gmail.com'),
  (17, 'Truscott Pharmacy',                               'pharmacist@truscottpharmacy.com'),
  (18, 'Robinson Pharmacy',                               'robinsons.ida@gmail.com'),
  (19, 'Malton Medical Pharmacy',                         'maltonmedicalpharmacy@gmail.com'),
  (20, 'Matheson Pharmacy',                               'mathesonpharmacy@yahoo.com'),
  (21, 'Ceremonial Pharmacy',                             'ceremonialpharmacy@hotmail.com'),
  (22, 'Century City Pharmacy',                           'centurycitypharmacy@gmail.com'),
  (23, 'Trelawny Pharmacy',                               'trelawny@centralparkwaypharmacy.ca'),
  (24, 'Greenfield Pharmacy',                             'greenfieldpharmacy1212@gmail.com'),
  (25, 'Agnes Medical Pharmacy',                          'agnespharmacy@gmail.com'),
  (26, 'Marcos Pharmacy',                                 'marcospharmacy@gmail.com'),
  (27, 'Hooper''s Pharmacy and Vitamin Shop',             'pcrx@hoopershealth.com'),
  (28, 'Dundas Clinical Pharmacy',                        'info@dundasclinicalpharmacy.com'),
  (29, 'Renew Lakeshore Pharmacy',                        'Rxlakeshore@gmail.com'),
  (30, 'Woodchester Pharmacy',                            'info@woodchesterida.com'),
  (31, 'Clarkson PharmaChoice',                           'pch639@pharmachoice.ca'),
  (32, 'Cross Lake Pharmacy',                             'info@crosslakepharmacy.com'),
  (33, 'MediOne Dundas427 Pharmacy',                      'dundas427pharmacy@gmail.com'),
  (34, 'Quality Care Pharmacy Shepard',                   'qcpshepard@hotmail.com'),
  (35, 'Inter Pharmacy',                                  'interpharmacy@hotmail.com'),
  (36, 'Bristol Pharmacy',                                'info@bristolpharmacy.ca'),
  (37, 'Urban Pharmacy',                                  'info@urbanrx.ca'),
  (38, 'Eglinton Churchill Pharmacy',                     'eglinton@princerx.ca'),
  (39, 'Kennedy Pharmacy',                                'info@kennedypharmacy.ca'),
  (40, 'The Chase Pharmacy',                              'thechasepharmacy@gmail.com'),
  (41, 'Doctors Lobby Pharmacy',                          'doctorslobbypharmacy@gmail.com'),
  (42, 'Professional Medical Pharmacy',                   'pmp6878@gmail.com'),
  (43, 'Glen Derry Pharmacy',                             'glenderrypharmacy@gmail.com'),
  (44, 'Sandalwood Drugs Pharmacy',                       'sandalwooddrugs@yahoo.ca'),
  (45, 'Faith Hope and Love Pharmacy',                    'faithhopeandlovepharmacy@gmail.com'),
  (46, 'M City Pharmacy',                                 'info@mcitypharmacy.ca'),
  (47, 'Quick-Med Pharmacy',                              'quickmed2025@gmail.com'),
  (48, 'Medi Plus Pharmacy 005',                          'info@mediplusdrugstore.com'),
  (49, 'Main Drug Mart',                                  'pharmacymaindrugmart@gmail.com'),
  (50, 'Rx Connect Specialty Pharmacy',                   'pharmacy@rxconnect.ca')
) as v(row_no, pharmacy_name, contact_email);

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
