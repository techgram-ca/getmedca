-- Public pharmacy URLs carry the postal code.
--
-- A chain uses the same name in every city it is in, so a name-only slug
-- collides: three branches all wanted /p/shoppers-drug-mart and whichever
-- submitted second got four characters of its UUID appended, which tells a
-- patient nothing about which branch they are looking at. A postal code is
-- unique to the address, so it breaks the tie and identifies the branch.
--
-- This rebuilds the slugs already issued. New ones are built in the app by
-- pharmacySlug() in packages/core/src/format.ts; the two agree for every name
-- made of ASCII letters, digits and punctuation. They differ only on accented
-- characters, which the app folds to their base letter (é → e) and Postgres
-- here replaces with a separator, so a pharmacy whose name carries one gets a
-- slug that is still correct and unique, just not identical to a fresh one.
--
-- Pharmacies with no usable postal code keep a name-only slug, and anything
-- that would collide is left exactly as it is rather than renamed twice.

with rebuilt as (
  select
    id,
    slug as old_slug,
    nullif(
      regexp_replace(
        left(
          trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')),
          50
        ),
        '-+$', '', 'g'
      ),
      ''
    ) as base,
    case
      when lower(regexp_replace(coalesce(postal_code, ''), '[^A-Za-z0-9]', '', 'g'))
           ~ '^[a-z][0-9][a-z][0-9][a-z][0-9]$'
        then lower(regexp_replace(postal_code, '[^A-Za-z0-9]', '', 'g'))
      when left(lower(regexp_replace(coalesce(postal_code, ''), '[^A-Za-z0-9]', '', 'g')), 3)
           ~ '^[a-z][0-9][a-z]$'
        then left(lower(regexp_replace(postal_code, '[^A-Za-z0-9]', '', 'g')), 3)
      else ''
    end as suffix
  from public.pharmacies
  where slug is not null
),
proposed as (
  select
    id,
    old_slug,
    case
      when base is null then suffix
      when suffix = '' then base
      else base || '-' || suffix
    end as new_slug
  from rebuilt
)
update public.pharmacies p
set slug = proposed.new_slug
from proposed
where p.id = proposed.id
  and proposed.new_slug <> ''
  and proposed.new_slug <> proposed.old_slug
  -- Never create a duplicate: unique(slug) would abort the whole migration,
  -- and a pharmacy keeping its old URL is better than none of them moving.
  and not exists (
    select 1 from public.pharmacies other
    where other.slug = proposed.new_slug and other.id <> proposed.id
  );
