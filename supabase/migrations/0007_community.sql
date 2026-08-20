-- ═══════════════════════════════════════════════════════════════════════════
-- 0007 — Topluluk: geri bildirim, kitap takası, kitap bağışı
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Geri bildirim ─────────────────────────────────────────────────────────
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  topic public.feedback_topic not null,
  message text not null check (char_length(trim(message)) between 1 and 4000),
  status public.feedback_status not null default 'new',
  staff_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index feedback_status_idx on public.feedback (status, created_at desc);

create trigger feedback_updated_at before update on public.feedback
  for each row execute function public.set_updated_at();

-- ─── Bağış kurumları ───────────────────────────────────────────────────────
-- Tablo olması, yeni kurum eklemek için yeniden yayın gerektirmemesini sağlar.
create table public.donation_organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  website text,
  is_active boolean not null default true,
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger donation_organizations_updated_at before update on public.donation_organizations
  for each row execute function public.set_updated_at();

-- ─── Bağış talepleri ───────────────────────────────────────────────────────
create table public.donation_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  organization_id uuid not null references public.donation_organizations (id),
  full_name text not null check (char_length(trim(full_name)) between 2 and 120),
  phone text not null,
  city text not null,
  address text not null check (char_length(trim(address)) between 5 and 500),
  approximate_count smallint check (approximate_count between 1 and 10000),
  note text,
  status public.donation_status not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index donation_requests_user_idx on public.donation_requests (user_id, created_at desc);
create index donation_requests_status_idx on public.donation_requests (status, created_at desc);

create trigger donation_requests_updated_at before update on public.donation_requests
  for each row execute function public.set_updated_at();

-- ─── Takas ilanları ────────────────────────────────────────────────────────
-- Telefon numarası içerdiği için yalnızca giriş yapmış kullanıcılar okuyabilir.
create table public.exchange_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  -- Katalogdan seçildiyse bağlanır; değilse serbest metin.
  book_id uuid references public.books (id) on delete set null,
  title text not null check (char_length(trim(title)) between 1 and 200),
  author_name text,

  age_min smallint check (age_min between 0 and 18),
  age_max smallint check (age_max between 0 and 18),
  condition public.book_condition not null default 'good',
  offer text check (offer is null or char_length(offer) <= 300),

  contact_name text not null check (char_length(trim(contact_name)) between 2 and 80),
  city text not null,
  district text,
  phone text not null,

  status public.listing_status not null default 'active',
  expires_at timestamptz not null default (now() + interval '90 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exchange_listings_active_idx
  on public.exchange_listings (created_at desc)
  where status = 'active';
create index exchange_listings_city_idx on public.exchange_listings (city)
  where status = 'active';
create index exchange_listings_owner_idx on public.exchange_listings (owner_id, created_at desc);

create trigger exchange_listings_updated_at before update on public.exchange_listings
  for each row execute function public.set_updated_at();

-- ═══ RLS ═══════════════════════════════════════════════════════════════════

alter table public.feedback enable row level security;
alter table public.donation_organizations enable row level security;
alter table public.donation_requests enable row level security;
alter table public.exchange_listings enable row level security;

create policy "feedback_insert_own" on public.feedback
  for insert to authenticated with check (user_id = auth.uid());
create policy "feedback_read_own" on public.feedback
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "feedback_staff_update" on public.feedback
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "donation_organizations_public_read" on public.donation_organizations
  for select using (is_active or public.is_staff());
create policy "donation_organizations_staff_write" on public.donation_organizations
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "donation_requests_insert_own" on public.donation_requests
  for insert to authenticated with check (user_id = auth.uid());
create policy "donation_requests_read_own" on public.donation_requests
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
create policy "donation_requests_staff_update" on public.donation_requests
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- İlanları yalnızca giriş yapmış kullanıcılar görür (telefon numarası var).
create policy "exchange_listings_read_authenticated" on public.exchange_listings
  for select to authenticated
  using ((status = 'active' and expires_at > now()) or owner_id = auth.uid() or public.is_staff());
create policy "exchange_listings_insert_own" on public.exchange_listings
  for insert to authenticated with check (owner_id = auth.uid());
create policy "exchange_listings_update_own" on public.exchange_listings
  for update to authenticated
  using (owner_id = auth.uid() or public.is_staff())
  with check (owner_id = auth.uid() or public.is_staff());
create policy "exchange_listings_delete_own" on public.exchange_listings
  for delete to authenticated using (owner_id = auth.uid() or public.is_staff());
