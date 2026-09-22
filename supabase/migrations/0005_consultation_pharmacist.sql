-- ---------------------------------------------------------------------
-- 0005 · Consultations are listed by pharmacist, and carry a price
--
-- The consultation results page now lists the pharmacists who can take the
-- call rather than the pharmacies they work at, filterable by the languages
-- they speak, with the price for that topic. Two things were missing:
-- a price per topic, and a record of which pharmacist the patient chose.
-- ---------------------------------------------------------------------

-- A pharmacy sets its own price per consultation topic. Null means no fee,
-- which is what every existing row is: nobody was charging before this.
alter table public.pharmacy_issues
  add column price numeric(10,2)
    constraint pharmacy_issues_price_non_negative check (price is null or price >= 0);

-- Who the patient picked, and what they were quoted. The price is snapshotted
-- so a later price change never reprices a request already made — the same rule
-- delivery pricing follows.
alter table public.consultation_requests
  add column pharmacist_id uuid references public.pharmacists (id) on delete set null,
  add column price_quoted numeric(10,2);

create index consultation_requests_pharmacist_idx
  on public.consultation_requests (pharmacist_id)
  where pharmacist_id is not null;

-- The listing filters on the languages a pharmacist speaks, across every
-- pharmacist near the patient.
create index pharmacists_languages_gix on public.pharmacists using gin (languages);
