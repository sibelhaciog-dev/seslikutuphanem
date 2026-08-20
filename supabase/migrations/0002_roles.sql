-- ═══════════════════════════════════════════════════════════════════════════
-- 0002 — Roller ve yetki yardımcıları
--
-- Rolü olmayan kullanıcı normal üyedir; satır yalnızca yükseltme için eklenir.
-- Yetki fonksiyonları burada tanımlanır çünkü sonraki tüm migration'ların
-- politikaları bunları kullanır.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.user_roles (
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.app_role not null,
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null,
  primary key (user_id, role)
);

-- SECURITY DEFINER: politikalar içinden çağrıldıklarında RLS'e takılmasınlar
-- ve user_roles politikası kendini çağırıp özyinelemeye girmesin diye.

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role in ('editor', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = auth.uid() and role = 'admin'
  );
$$;

alter table public.user_roles enable row level security;

create policy "user_roles_read_own" on public.user_roles
  for select to authenticated using (user_id = auth.uid() or public.is_admin());
create policy "user_roles_admin_write" on public.user_roles
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
