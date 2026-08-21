-- ═══════════════════════════════════════════════════════════════════════════
-- 0020 — Keşif modları (ADR 0007)
--
-- Keşif çerçevesindeki "Sakinleşelim", "Gülelim" gibi modlar. Her mod aday
-- havuzunu belirli gelişim konularına ve ilgi alanlarına doğru eğer.
--
-- NEDEN VERİTABANINDA: Modlar kod içinde sabit olsaydı yeni bir mod eklemek
-- ya da bir ağırlığı değiştirmek yeni sürüm gerektirirdi. Oysa bunlar
-- editoryal ayar — hangi modun hangi konuya ne kadar eğileceği zamanla
-- deneyerek bulunur. Yönetim arayüzünden düzenlenebilmeli.
--
-- Ağırlık modeli `book_topics.relevance` ile aynı mantıkta: 1 zayıf, 5 güçlü.
-- Aday havuzu skorlaması bu ağırlıkları çarpan olarak kullanır.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.discovery_modes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),

  name text not null check (char_length(trim(name)) between 1 and 60),
  emoji text,
  /** Çipin altında görünen kısa ipucu. */
  description text check (description is null or char_length(description) <= 200),
  /** Yapay zekâ istemine eklenen cümle — modun niyetini modele anlatır. */
  prompt_hint text check (prompt_hint is null or char_length(prompt_hint) <= 400),

  /** Boşsa dil ayrımı yapılmaz. */
  language public.language_code,

  position smallint not null default 0,
  is_active boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index discovery_modes_active_idx on public.discovery_modes (position)
  where is_active;

create trigger discovery_modes_updated_at before update on public.discovery_modes
  for each row execute function public.set_updated_at();

-- ─── Mod → gelişim konusu eğilimi ──────────────────────────────────────────
create table public.discovery_mode_topics (
  mode_id uuid not null references public.discovery_modes (id) on delete cascade,
  topic_id uuid not null references public.development_topics (id) on delete cascade,
  weight smallint not null default 3 check (weight between 1 and 5),
  primary key (mode_id, topic_id)
);

create index discovery_mode_topics_topic_idx on public.discovery_mode_topics (topic_id);

-- ─── Mod → ilgi alanı eğilimi ──────────────────────────────────────────────
create table public.discovery_mode_interests (
  mode_id uuid not null references public.discovery_modes (id) on delete cascade,
  interest_id uuid not null references public.interests (id) on delete cascade,
  weight smallint not null default 3 check (weight between 1 and 5),
  primary key (mode_id, interest_id)
);

create index discovery_mode_interests_interest_idx
  on public.discovery_mode_interests (interest_id);

-- ─── Okuma görünümü ────────────────────────────────────────────────────────
-- Motor tek sorguda modu ve eğilimlerini alsın diye.
create view public.discovery_mode_details with (security_invoker = on) as
select
  m.id,
  m.slug,
  m.name,
  m.emoji,
  m.description,
  m.prompt_hint,
  m.language,
  m.position,
  m.is_active,
  coalesce(
    (select jsonb_agg(jsonb_build_object('slug', t.slug, 'weight', mt.weight)
                      order by mt.weight desc, t.slug)
     from public.discovery_mode_topics mt
     join public.development_topics t on t.id = mt.topic_id
     where mt.mode_id = m.id),
    '[]'::jsonb
  ) as topics,
  coalesce(
    (select jsonb_agg(jsonb_build_object('slug', i.slug, 'weight', mi.weight)
                      order by mi.weight desc, i.slug)
     from public.discovery_mode_interests mi
     join public.interests i on i.id = mi.interest_id
     where mi.mode_id = m.id),
    '[]'::jsonb
  ) as interests
from public.discovery_modes m;

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
-- Taksonomiyle aynı desen: herkes okur (pasif modlar yalnızca ekibe),
-- yalnızca editör/yönetici yazar.
alter table public.discovery_modes enable row level security;
alter table public.discovery_mode_topics enable row level security;
alter table public.discovery_mode_interests enable row level security;

create policy "discovery_modes_public_read" on public.discovery_modes
  for select using (is_active or (select public.is_staff()));
create policy "discovery_modes_staff_insert" on public.discovery_modes
  for insert to authenticated with check ((select public.is_staff()));
create policy "discovery_modes_staff_update" on public.discovery_modes
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "discovery_modes_staff_delete" on public.discovery_modes
  for delete to authenticated using ((select public.is_staff()));

create policy "discovery_mode_topics_public_read" on public.discovery_mode_topics
  for select using (true);
create policy "discovery_mode_topics_staff_insert" on public.discovery_mode_topics
  for insert to authenticated with check ((select public.is_staff()));
create policy "discovery_mode_topics_staff_update" on public.discovery_mode_topics
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "discovery_mode_topics_staff_delete" on public.discovery_mode_topics
  for delete to authenticated using ((select public.is_staff()));

create policy "discovery_mode_interests_public_read" on public.discovery_mode_interests
  for select using (true);
create policy "discovery_mode_interests_staff_insert" on public.discovery_mode_interests
  for insert to authenticated with check ((select public.is_staff()));
create policy "discovery_mode_interests_staff_update" on public.discovery_mode_interests
  for update to authenticated
  using ((select public.is_staff())) with check ((select public.is_staff()));
create policy "discovery_mode_interests_staff_delete" on public.discovery_mode_interests
  for delete to authenticated using ((select public.is_staff()));

grant select on public.discovery_modes to anon, authenticated;
grant select on public.discovery_mode_topics to anon, authenticated;
grant select on public.discovery_mode_interests to anon, authenticated;
grant select on public.discovery_mode_details to anon, authenticated;
grant insert, update, delete on public.discovery_modes to authenticated;
grant insert, update, delete on public.discovery_mode_topics to authenticated;
grant insert, update, delete on public.discovery_mode_interests to authenticated;
