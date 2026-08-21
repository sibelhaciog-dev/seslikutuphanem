-- ═══════════════════════════════════════════════════════════════════════════
-- 0004 — Katalog: kitaplar ve çevresindeki varlıklar
--
-- Kaynak `content/books.json`; `npm run db:sync` slug üzerinden upsert eder.
-- Yayındaki kitapları herkes okuyabilir; yazma yetkisi editör/yöneticide.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Yayınevleri ───────────────────────────────────────────────────────────
create table public.publishers (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  website text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger publishers_updated_at before update on public.publishers
  for each row execute function public.set_updated_at();

-- ─── Kişiler (yazar, çizer, çevirmen) ──────────────────────────────────────
create table public.people (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  display_name text not null,
  sort_name text,
  bio text,
  -- Instagram tanıtımlarında yazarlar çoğunlukla @hesap olarak etiketleniyor.
  instagram_handle text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index people_name_trgm_idx on public.people using gin (display_name extensions.gin_trgm_ops);

create trigger people_updated_at before update on public.people
  for each row execute function public.set_updated_at();

-- ─── Seriler ───────────────────────────────────────────────────────────────
create table public.series (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  description text,
  publisher_id uuid references public.publishers (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger series_updated_at before update on public.series
  for each row execute function public.set_updated_at();

-- ─── Kitaplar ──────────────────────────────────────────────────────────────
create table public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),

  title text not null check (char_length(trim(title)) between 1 and 200),
  subtitle text,
  original_title text,
  summary text not null default '',        -- kart ve arama sonucu için kısa metin
  description text,                        -- kitap sayfasındaki uzun metin

  language public.language_code not null default 'tr',

  -- Yaş aralığı sayıyla tutulur; "4+ yaş" gibi etiketler arayüzde üretilir.
  age_min smallint check (age_min between 0 and 18),
  age_max smallint check (age_max between 0 and 18),
  constraint books_age_range check (age_min is null or age_max is null or age_min <= age_max),

  page_count smallint check (page_count > 0),
  isbn13 text unique check (isbn13 is null or isbn13 ~ '^[0-9]{13}$'),
  published_year smallint check (published_year between 1800 and 2100),

  publisher_id uuid references public.publishers (id) on delete set null,
  series_id uuid references public.series (id) on delete set null,
  series_position smallint,

  -- Kapak: depolama kovasındaki yol. Yoksa arayüz tipografik kapak üretir.
  cover_path text,

  instagram_url text,
  instagram_shortcode text unique,
  like_count integer not null default 0 check (like_count >= 0),
  posted_at date,                          -- Instagram gönderi tarihi

  status public.content_status not null default 'published',
  featured_at timestamptz,

  -- Tetikleyiciyle güncellenir (katkıda bulunanların adları da dahil).
  search_vector tsvector,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index books_status_posted_idx on public.books (status, posted_at desc nulls last);
create index books_language_idx on public.books (language) where status = 'published';
create index books_age_idx on public.books (age_min, age_max) where status = 'published';
create index books_search_idx on public.books using gin (search_vector);
create index books_title_trgm_idx on public.books using gin (title extensions.gin_trgm_ops);
create index books_series_idx on public.books (series_id, series_position);

create trigger books_updated_at before update on public.books
  for each row execute function public.set_updated_at();

-- ─── Katkıda bulunanlar ────────────────────────────────────────────────────
create table public.book_contributors (
  book_id uuid not null references public.books (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  role public.contributor_role not null default 'author',
  position smallint not null default 0,
  primary key (book_id, person_id, role)
);

create index book_contributors_person_idx on public.book_contributors (person_id);

-- ─── Kitap ↔ gelişim konusu ────────────────────────────────────────────────
create table public.book_topics (
  book_id uuid not null references public.books (id) on delete cascade,
  topic_id uuid not null references public.development_topics (id) on delete cascade,
  -- 1: zayıf ilişki, 5: kitabın ana konusu
  relevance smallint not null default 3 check (relevance between 1 and 5),
  -- 'editorial': elle etiketlendi, 'auto': anahtar kelimeden çıkarıldı
  source public.topic_source not null default 'editorial',
  primary key (book_id, topic_id)
);

create index book_topics_topic_idx on public.book_topics (topic_id, relevance desc);

-- ─── Kitap ↔ ilgi alanı ────────────────────────────────────────────────────
create table public.book_interests (
  book_id uuid not null references public.books (id) on delete cascade,
  interest_id uuid not null references public.interests (id) on delete cascade,
  source public.topic_source not null default 'auto',
  primary key (book_id, interest_id)
);

create index book_interests_interest_idx on public.book_interests (interest_id);

-- ═══ Arama vektörü ═════════════════════════════════════════════════════════
-- Üretilmiş sütun (generated column) kullanılamıyor: yazar adları başka bir
-- tablodan geliyor. Bu yüzden tetikleyiciyle bakımı yapılıyor.

create or replace function public.refresh_book_search_vector(target_book_id uuid)
returns void
language plpgsql
as $$
declare
  contributor_names text;
begin
  select coalesce(string_agg(p.display_name, ' '), '')
  into contributor_names
  from public.book_contributors bc
  join public.people p on p.id = bc.person_id
  where bc.book_id = target_book_id;

  update public.books b
  set search_vector =
        setweight(to_tsvector('public.search_tr', coalesce(b.title, '')), 'A')
     || setweight(to_tsvector('public.search_tr', coalesce(b.subtitle, '')), 'B')
     || setweight(to_tsvector('public.search_tr', contributor_names), 'B')
     || setweight(to_tsvector('public.search_tr', coalesce(b.summary, '')), 'C')
     || setweight(to_tsvector('public.search_tr', coalesce(b.description, '')), 'D')
  where b.id = target_book_id;
end;
$$;

create or replace function public.books_search_vector_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_book_search_vector(new.id);
  return null;  -- AFTER tetikleyicisi
end;
$$;

create trigger books_search_vector_sync
  after insert or update of title, subtitle, summary, description
  on public.books
  for each row execute function public.books_search_vector_trigger();

create or replace function public.book_contributors_search_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_book_search_vector(coalesce(new.book_id, old.book_id));
  return null;
end;
$$;

create trigger book_contributors_search_sync
  after insert or update or delete on public.book_contributors
  for each row execute function public.book_contributors_search_trigger();

-- ═══ RLS ═══════════════════════════════════════════════════════════════════

alter table public.publishers enable row level security;
alter table public.people enable row level security;
alter table public.series enable row level security;
alter table public.books enable row level security;
alter table public.book_contributors enable row level security;
alter table public.book_topics enable row level security;
alter table public.book_interests enable row level security;

-- Yayındaki kitaplar herkese açık; taslak ve arşiv yalnızca ekibe görünür.
create policy "books_public_read" on public.books
  for select using (status = 'published' or public.is_staff());
create policy "books_staff_write" on public.books
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "publishers_public_read" on public.publishers for select using (true);
create policy "publishers_staff_write" on public.publishers
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "people_public_read" on public.people for select using (true);
create policy "people_staff_write" on public.people
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "series_public_read" on public.series for select using (true);
create policy "series_staff_write" on public.series
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "book_contributors_public_read" on public.book_contributors for select using (true);
create policy "book_contributors_staff_write" on public.book_contributors
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "book_topics_public_read" on public.book_topics for select using (true);
create policy "book_topics_staff_write" on public.book_topics
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "book_interests_public_read" on public.book_interests for select using (true);
create policy "book_interests_staff_write" on public.book_interests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
