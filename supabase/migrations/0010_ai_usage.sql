-- ═══════════════════════════════════════════════════════════════════════════
-- 0010 — Yapay zekâ kullanım kaydı ve kota
--
-- Kapak tarama ve rapor yorumu gibi özellikler sağlayıcıya para ödeterek
-- çalışır. Kullanıcı başına günlük kota bu tablodan hesaplanır.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.ai_usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  feature text not null check (feature in ('cover_scan', 'report_note')),
  model text,
  total_tokens integer check (total_tokens >= 0),
  succeeded boolean not null default true,
  created_at timestamptz not null default now()
);

create index ai_usage_user_feature_idx
  on public.ai_usage_events (user_id, feature, created_at desc);

-- Kalan kota. SECURITY DEFINER: kullanıcı kendi satırlarını göremese bile
-- doğru sayıyı verebilmek için.
create or replace function public.ai_quota_remaining(
  target_feature text,
  window_hours integer,
  quota integer
)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select greatest(0, quota - (
    select count(*)::integer
    from public.ai_usage_events
    where user_id = auth.uid()
      and feature = target_feature
      and succeeded
      and created_at > now() - make_interval(hours => window_hours)
  ));
$$;

alter table public.ai_usage_events enable row level security;

create policy "ai_usage_insert_own" on public.ai_usage_events
  for insert to authenticated with check (user_id = auth.uid());
create policy "ai_usage_read_own" on public.ai_usage_events
  for select to authenticated using (user_id = auth.uid() or public.is_staff());
