-- ═══════════════════════════════════════════════════════════════════════════
-- 0006 — Kütüphane: okuma durumu, okuma oturumları, notlar, başarımlar
--
-- Tasarım gerekçesi: docs/decisions/0004-kutuphane-modeli.md
-- Kısaca: "bugünkü durum" (library_items) ile "her okuma olayı"
-- (reading_sessions) ayrı tutulur. Bir kitap defalarca okunabilir.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Kullanıcının kendi eklediği kitaplar ──────────────────────────────────
-- Kapak taramasıyla veya elle eklenen, katalogda olmayan kitaplar. Katalog
-- temiz kalsın diye ayrı tabloda.
create table public.custom_books (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 200),
  author_name text,
  summary text,
  cover_path text,
  origin public.book_origin not null default 'manual',
  -- Sonradan katalogda eşleşen kitap bulunursa buraya bağlanır.
  matched_book_id uuid references public.books (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index custom_books_owner_idx on public.custom_books (owner_id, created_at desc);

create trigger custom_books_updated_at before update on public.custom_books
  for each row execute function public.set_updated_at();

-- ─── Kütüphane kayıtları ───────────────────────────────────────────────────
create table public.library_items (
  id uuid primary key default gen_random_uuid(),
  child_id uuid not null references public.children (id) on delete cascade,

  -- Katalog kitabı ya da kullanıcının kendi kitabı — tam olarak biri.
  book_id uuid references public.books (id) on delete cascade,
  custom_book_id uuid references public.custom_books (id) on delete cascade,
  constraint library_items_one_source
    check ((book_id is not null) <> (custom_book_id is not null)),

  status public.library_status not null default 'to_read',
  is_favorite boolean not null default false,
  rating smallint not null default 0 check (rating between 0 and 5),

  -- Okuma oturumlarından tetikleyiciyle türetilir; elle yazılmaz.
  times_read integer not null default 0 check (times_read >= 0),
  first_read_at date,
  last_read_at date,

  added_from public.book_origin not null default 'catalog',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Kısmi indeks yerine düz benzersizlik: NULL'lar birbiriyle çakışmadığı için
-- "custom kitap" satırlarında book_id NULL olabilir. Düz indeks olması,
-- PostgREST'in `on_conflict` ile upsert yapabilmesini de sağlıyor.
create unique index library_items_child_book_idx
  on public.library_items (child_id, book_id);
create unique index library_items_child_custom_idx
  on public.library_items (child_id, custom_book_id);
create index library_items_child_status_idx on public.library_items (child_id, status);
create index library_items_child_favorite_idx
  on public.library_items (child_id) where is_favorite;
create index library_items_book_idx on public.library_items (book_id);

create trigger library_items_updated_at before update on public.library_items
  for each row execute function public.set_updated_at();

-- Politikaların kullandığı sahiplik kontrolü (çocuk üzerinden).
create or replace function public.owns_library_item(target_item_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.library_items li
    join public.children c on c.id = li.child_id
    where li.id = target_item_id and c.owner_id = auth.uid()
  );
$$;

-- ─── Okuma oturumları ──────────────────────────────────────────────────────
create table public.reading_sessions (
  id uuid primary key default gen_random_uuid(),
  library_item_id uuid not null references public.library_items (id) on delete cascade,
  read_on date not null default current_date check (read_on <= current_date),
  minutes smallint check (minutes between 1 and 600),
  mood public.reading_mood,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index reading_sessions_item_idx on public.reading_sessions (library_item_id, read_on desc);
create index reading_sessions_date_idx on public.reading_sessions (read_on desc);

-- ─── Okuma notları ─────────────────────────────────────────────────────────
create table public.reading_notes (
  id uuid primary key default gen_random_uuid(),
  library_item_id uuid not null references public.library_items (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  visibility public.note_visibility not null default 'private',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reading_notes_item_idx on public.reading_notes (library_item_id, created_at desc);

create trigger reading_notes_updated_at before update on public.reading_notes
  for each row execute function public.set_updated_at();

-- ═══ Türetilmiş alanların bakımı ═══════════════════════════════════════════

create or replace function public.sync_library_item_reading_stats(target_item_id uuid)
returns void
language plpgsql
as $$
declare
  session_count integer;
  first_date date;
  last_date date;
begin
  select count(*), min(read_on), max(read_on)
  into session_count, first_date, last_date
  from public.reading_sessions
  where library_item_id = target_item_id;

  update public.library_items
  set times_read = session_count,
      first_read_at = first_date,
      last_read_at = last_date,
      -- İlk okuma kaydedilince "okunacak" durumu "okundu"ya geçer.
      status = case
        when session_count > 0 and status in ('to_read', 'reading') then 'read'
        else status
      end
  where id = target_item_id;
end;
$$;

create or replace function public.reading_sessions_sync_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.sync_library_item_reading_stats(coalesce(new.library_item_id, old.library_item_id));
  return null;
end;
$$;

create trigger reading_sessions_sync
  after insert or update or delete on public.reading_sessions
  for each row execute function public.reading_sessions_sync_trigger();

-- ═══ Başarımlar ════════════════════════════════════════════════════════════

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text not null,
  emoji text not null default '🏅',
  -- Örn: {"type": "books_read", "threshold": 10}
  criteria jsonb not null,
  points smallint not null default 0 check (points >= 0),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger achievements_updated_at before update on public.achievements
  for each row execute function public.set_updated_at();

create table public.child_achievements (
  child_id uuid not null references public.children (id) on delete cascade,
  achievement_id uuid not null references public.achievements (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (child_id, achievement_id)
);

create index child_achievements_child_idx on public.child_achievements (child_id, earned_at desc);

-- En uzun ardışık okuma günü serisi.
create or replace function public.child_reading_streak(target_child_id uuid)
returns integer
language sql
stable
as $$
  with days as (
    select distinct s.read_on
    from public.reading_sessions s
    join public.library_items li on li.id = s.library_item_id
    where li.child_id = target_child_id
  ),
  grouped as (
    select read_on,
           read_on - (row_number() over (order by read_on))::integer as streak_group
    from days
  )
  select coalesce(max(streak_length), 0)::integer
  from (select count(*) as streak_length from grouped group by streak_group) counts;
$$;

-- Kriterleri sağlanan başarımları verir. Okuma kaydedildikten sonra çağrılır.
create or replace function public.evaluate_child_achievements(target_child_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  granted integer := 0;
  achievement record;
  measured integer;
  criteria_type text;
  threshold integer;
begin
  for achievement in select * from public.achievements loop
    criteria_type := achievement.criteria ->> 'type';
    threshold := coalesce((achievement.criteria ->> 'threshold')::integer, 1);

    measured := case criteria_type
      when 'books_read' then (
        select count(*)::integer from public.library_items
        where child_id = target_child_id and status = 'read'
      )
      when 'sessions' then (
        select count(*)::integer from public.reading_sessions s
        join public.library_items li on li.id = s.library_item_id
        where li.child_id = target_child_id
      )
      when 'streak_days' then public.child_reading_streak(target_child_id)
      when 'ratings' then (
        select count(*)::integer from public.library_items
        where child_id = target_child_id and rating > 0
      )
      when 'favorites' then (
        select count(*)::integer from public.library_items
        where child_id = target_child_id and is_favorite
      )
      when 'notes' then (
        select count(*)::integer from public.reading_notes n
        join public.library_items li on li.id = n.library_item_id
        where li.child_id = target_child_id
      )
      when 'distinct_areas' then (
        select count(distinct dt.area_id)::integer
        from public.library_items li
        join public.book_topics bt on bt.book_id = li.book_id
        join public.development_topics dt on dt.id = bt.topic_id
        where li.child_id = target_child_id and li.status = 'read'
      )
      else 0
    end;

    if measured >= threshold then
      insert into public.child_achievements (child_id, achievement_id)
      values (target_child_id, achievement.id)
      on conflict do nothing;
      if found then granted := granted + 1; end if;
    end if;
  end loop;

  return granted;
end;
$$;

-- Avatar aksesuarları için yıldız puanı: puanlanan her kitap 1, başarımlar
-- kendi puanlarını ekler.
create or replace function public.child_points(target_child_id uuid)
returns integer
language sql
stable
as $$
  select (
    select count(*)::integer from public.library_items
    where child_id = target_child_id and rating > 0
  ) + coalesce((
    select sum(a.points)::integer
    from public.child_achievements ca
    join public.achievements a on a.id = ca.achievement_id
    where ca.child_id = target_child_id
  ), 0);
$$;

-- ═══ RLS ═══════════════════════════════════════════════════════════════════

alter table public.custom_books enable row level security;
alter table public.library_items enable row level security;
alter table public.reading_sessions enable row level security;
alter table public.reading_notes enable row level security;
alter table public.achievements enable row level security;
alter table public.child_achievements enable row level security;

create policy "custom_books_own" on public.custom_books
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "library_items_own" on public.library_items
  for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));

create policy "reading_sessions_own" on public.reading_sessions
  for all to authenticated
  using (public.owns_library_item(library_item_id))
  with check (public.owns_library_item(library_item_id));

create policy "reading_notes_own" on public.reading_notes
  for all to authenticated
  using (public.owns_library_item(library_item_id))
  with check (public.owns_library_item(library_item_id));

-- Başarım kataloğu herkese açık (kilitli rozetler de gösterilebilsin).
create policy "achievements_public_read" on public.achievements for select using (true);
create policy "achievements_staff_write" on public.achievements
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "child_achievements_own" on public.child_achievements
  for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));
