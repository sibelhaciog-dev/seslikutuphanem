-- ═══════════════════════════════════════════════════════════════════════════
-- 0019 — Yapay zekâ öneri geçmişi (ADR 0007)
--
-- Ebeveyn "kardeşi olacak, ona hazırlamak istiyorum" gibi bir niyet yazıyor;
-- sonuç saklanmazsa o emek bir kez kullanılıp kayboluyor. Bu tablo eski
-- çalıştırmalara dönmeyi sağlıyor.
--
-- NEDEN `ai_usage_events` DEĞİL: o tablo kota muhasebesi — kullanıcı başına
-- kaç çağrı yapıldığını sayıyor ve `succeeded` alanına göre kotadan düşüyor.
-- Buradaki satırlar ise KULLANICI İÇERİĞİ: niyet metni ve sonuçlar. Farklı
-- amaç, farklı yaşam süresi, farklı gizlilik beklentisi. Aynı tabloda
-- birleştirmek ikisini de bozardı.
-- ═══════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ai_result_source') then
    -- Sonuç yapay zekâdan mı geldi, yoksa servis kapalı/hatalı olduğu için
    -- deterministik sıralama mı gösterildi (ADR 0007, adım [4])?
    create type public.ai_result_source as enum ('ai', 'deterministic');
  end if;
end $$;

create table public.ai_recommendations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,

  -- Profil zorunlu değil: mod ve serbest metinle de öneri üretilebiliyor.
  -- `set null`: çocuk silinse bile ebeveynin geçmişi kaybolmasın.
  child_id uuid references public.children (id) on delete set null,

  /** Mod anahtarı (`sakin`, `duygu`…). Arayüzdeki çipler; boş olabilir. */
  mode text check (mode is null or char_length(mode) between 1 and 40),
  /** Ebeveynin serbest metni. */
  prompt text check (prompt is null or char_length(trim(prompt)) between 1 and 500),

  /** [{ bookId, slug, title, reason }] — sıralama dizideki sıradır. */
  results jsonb not null check (jsonb_typeof(results) = 'array'),

  source public.ai_result_source not null default 'ai',
  model text,
  total_tokens integer check (total_tokens is null or total_tokens >= 0),

  created_at timestamptz not null default now()
);

create index ai_recommendations_user_idx
  on public.ai_recommendations (user_id, created_at desc);
create index ai_recommendations_child_idx
  on public.ai_recommendations (child_id) where child_id is not null;

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
-- Niyet metni ebeveynin özel bilgisi ("boşanma sürecindeyiz" yazabilir).
-- Personelin bile görmesi için bir sebep yok.
alter table public.ai_recommendations enable row level security;

create policy "ai_recommendations_read_own" on public.ai_recommendations
  for select to authenticated using (user_id = (select auth.uid()));
create policy "ai_recommendations_insert_own" on public.ai_recommendations
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "ai_recommendations_delete_own" on public.ai_recommendations
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, delete on public.ai_recommendations to authenticated;
