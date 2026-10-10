-- Public delivery rate cards, one per city a pharmacy might operate in.
--
-- A card is addressed by its slug (/delivery-rates/vaughan) and holds the
-- rows a pharmacy in that city would pay: where a delivery goes, and what it
-- costs. Kept apart from the live pricing in pharmacy_delivery_config and the
-- zone tables, which is what actually settles a delivery. This is the quoted
-- rate a pharmacy is shown before it signs up, and the two move for different
-- reasons — editing a published rate card must never reprice a live order.
create table public.delivery_rate_cards (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  slug text not null unique,
  -- Hidden cards stay editable but 404 to the public, so a card can be drafted
  -- in full before anyone can be sent a link to it.
  published boolean not null default true,
  -- Optional line under the table, for anything a city needs said about it.
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.delivery_rate_rows (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references public.delivery_rate_cards (id) on delete cascade,
  destination text not null,
  price numeric(10, 2) not null check (price >= 0),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index delivery_rate_rows_card_idx on public.delivery_rate_rows (card_id, sort_order);

-- One rate per destination per card, whatever case it was typed in. Without
-- this a card ends up quoting "Brampton 7" and "brampton 9" on the same page.
create unique index delivery_rate_rows_unique_dest on public.delivery_rate_rows (card_id, lower(destination));

create trigger delivery_rate_cards_updated_at
  before update on public.delivery_rate_cards
  for each row execute function public.set_updated_at();

-- RLS is not optional here. Every table in public is granted to anon, so
-- without a policy set these would be world-writable through PostgREST.
-- Anyone may read a published card; nobody may write one except the admin
-- tools, which hold the secret key and bypass RLS entirely.
alter table public.delivery_rate_cards enable row level security;
alter table public.delivery_rate_rows enable row level security;

create policy "rate cards: public read published" on public.delivery_rate_cards
  for select using (published or public.is_admin());
create policy "rate cards: admin all" on public.delivery_rate_cards
  for all using (public.is_admin()) with check (public.is_admin());

create policy "rate rows: public read published" on public.delivery_rate_rows
  for select using (
    exists (select 1 from public.delivery_rate_cards c where c.id = card_id and (c.published or public.is_admin()))
  );
create policy "rate rows: admin all" on public.delivery_rate_rows
  for all using (public.is_admin()) with check (public.is_admin());
