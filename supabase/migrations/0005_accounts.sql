-- ═══════════════════════════════════════════════════════════════════════════
-- 0005 — Hesaplar: ebeveyn profilleri, roller, çocuk profilleri
--
-- Bu tablolardaki her satır tek bir ebeveyne aittir. Varsayılan gizlilik:
-- kimse başkasının verisini göremez (PRD ilke 2).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Ebeveyn profili ───────────────────────────────────────────────────────
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email extensions.citext,
  display_name text check (display_name is null or char_length(trim(display_name)) between 1 and 80),
  locale text not null default 'tr',
  timezone text not null default 'Europe/Istanbul',
  onboarding_completed_at timestamptz,
  marketing_opt_in boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─── Kayıt olunca profili oluştur ──────────────────────────────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name',
                         new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─── Çocuk profilleri ──────────────────────────────────────────────────────
create table public.children (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,

  name text not null check (char_length(trim(name)) between 1 and 40),
  birth_date date check (birth_date > '2000-01-01' and birth_date <= current_date),
  gender public.child_gender not null default 'unspecified',

  -- Avatar: karakter kimliği + açılmış aksesuar listesi (bkz. src/lib/avatar.ts)
  avatar_character text not null default 'k1',
  avatar_accessories text[] not null default '{}',

  notes text,                       -- ebeveynin kendi notu
  position smallint not null default 0,
  archived_at timestamptz,          -- silmek yerine arşivlemek için

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index children_owner_idx on public.children (owner_id, position)
  where archived_at is null;

create trigger children_updated_at before update on public.children
  for each row execute function public.set_updated_at();

-- Politikaların kullandığı sahiplik kontrolü.
create or replace function public.owns_child(target_child_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.children
    where id = target_child_id and owner_id = auth.uid()
  );
$$;

-- ─── Çocuğun ilgi alanları ─────────────────────────────────────────────────
create table public.child_interests (
  child_id uuid not null references public.children (id) on delete cascade,
  interest_id uuid not null references public.interests (id) on delete cascade,
  primary key (child_id, interest_id)
);

-- ─── Çocuğun öncelikli gelişim konuları ────────────────────────────────────
-- v1'de tek bir "priority_guidance" alanıydı; artık birden çok konu seçilebilir.
create table public.child_focus_topics (
  child_id uuid not null references public.children (id) on delete cascade,
  topic_id uuid not null references public.development_topics (id) on delete cascade,
  priority smallint not null default 1 check (priority between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (child_id, topic_id)
);

-- ═══ RLS ═══════════════════════════════════════════════════════════════════

alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.child_interests enable row level security;
alter table public.child_focus_topics enable row level security;

create policy "profiles_read_own" on public.profiles
  for select to authenticated using (id = auth.uid() or public.is_staff());
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "children_own" on public.children
  for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "child_interests_own" on public.child_interests
  for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));

create policy "child_focus_topics_own" on public.child_focus_topics
  for all to authenticated
  using (public.owns_child(child_id)) with check (public.owns_child(child_id));
