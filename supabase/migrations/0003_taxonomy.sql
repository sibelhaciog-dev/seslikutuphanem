-- ═══════════════════════════════════════════════════════════════════════════
-- 0003 — Taksonomi: gelişim rehberleri, konular, ilgi alanları
--
-- İçerik `content/taxonomy.json` dosyasından `npm run db:sync` ile yüklenir.
-- Herkes okuyabilir; yalnızca editör/yönetici yazabilir.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Gelişim alanları (sol menüdeki 8 rehber) ──────────────────────────────
create table public.development_areas (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  description text,
  emoji text not null default '📚',
  color text not null default '#8E8E93' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index development_areas_position_idx on public.development_areas (position);

create trigger development_areas_updated_at
  before update on public.development_areas
  for each row execute function public.set_updated_at();

-- ─── Alt başlıklar ─────────────────────────────────────────────────────────
create table public.development_topics (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null references public.development_areas (id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null,
  label text,                       -- menüde farklı görünecekse
  description text,
  -- Etiketlenmemiş kitapları yakalamak için kullanılan desenler.
  -- Yalnızca senkronizasyon sırasında (sunucuda) kullanılır.
  keywords text[] not null default '{}',
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (area_id, name)
);

create index development_topics_area_idx on public.development_topics (area_id, position);

create trigger development_topics_updated_at
  before update on public.development_topics
  for each row execute function public.set_updated_at();

-- ─── İlgi alanları (çocuk profilinde seçilir) ──────────────────────────────
create table public.interests (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name text not null unique,
  emoji text not null default '⭐',
  keywords text[] not null default '{}',
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index interests_position_idx on public.interests (position);

create trigger interests_updated_at
  before update on public.interests
  for each row execute function public.set_updated_at();

-- ═══ RLS ═══════════════════════════════════════════════════════════════════

alter table public.development_areas enable row level security;
alter table public.development_topics enable row level security;
alter table public.interests enable row level security;

-- Taksonomi herkese açık: giriş yapmamış ziyaretçi de rehberleri görmeli.
create policy "development_areas_public_read" on public.development_areas
  for select using (true);
create policy "development_areas_staff_write" on public.development_areas
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "development_topics_public_read" on public.development_topics
  for select using (true);
create policy "development_topics_staff_write" on public.development_topics
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "interests_public_read" on public.interests
  for select using (true);
create policy "interests_staff_write" on public.interests
  for all to authenticated using (public.is_staff()) with check (public.is_staff());
