-- ═══════════════════════════════════════════════════════════════════════════
-- 0001 — Temel: uzantılar, enum'lar, yardımcı fonksiyonlar
--
-- Bu şema SIFIRDAN kurulur. Eski sürümle uyumluluk kaygısı yoktur (ADR 0006).
-- Sıralı çalıştırın: 0001 → 0012.
-- ═══════════════════════════════════════════════════════════════════════════

-- Uzantılar `extensions` şemasına kurulur (Supabase'in yerleşik düzeni).
-- `public` içine kurmak Supabase güvenlik denetçisinin uyardığı bir durumdur;
-- ayrıca pgcrypto zaten orada kurulu geldiği için karışıklık çıkarır.
create schema if not exists extensions;

create extension if not exists pgcrypto with schema extensions;
create extension if not exists citext with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- ─── Türkçe tam metin arama yapılandırması ─────────────────────────────────
-- Bilinçli olarak GÖVDELEME (stemming) YOK.
--
-- Türkçe eklemeli bir dildir: kök başta durur, ekler arkaya eklenir. Snowball
-- Türkçe gövdeleyicisi bu yapıda tutarsız sonuç veriyor ("kardeşinin" → "karde",
-- "kardeşlik" → "kardeslik", "kardeş" → "kardes"), yani aynı kökten gelen
-- kelimeler eşleşmiyor.
--
-- Bunun yerine yalnızca aksan sadeleştirmesi yapıp arama sorgusunda önek
-- eşleştirmesi (`kardes:*`) kullanıyoruz. "kardeş", "kardeşim", "kardeşlik",
-- "kardeşinin" hepsi tek sorguyla yakalanıyor.
do $$
begin
  if not exists (select 1 from pg_ts_config where cfgname = 'search_tr') then
    create text search configuration public.search_tr (copy = simple);
    alter text search configuration public.search_tr
      alter mapping for hword, hword_part, word with extensions.unaccent, simple;
  end if;
end $$;

-- Kullanıcının yazdığı metni güvenli bir tsquery'ye çevirir.
-- Noktalama ve operatör karakterleri temizlenir; her kelime önek araması olur.
create or replace function public.build_search_query(input text)
returns tsquery
language plpgsql
stable
as $$
declare
  cleaned text;
  terms text[];
begin
  cleaned := lower(extensions.unaccent(coalesce(input, '')));
  cleaned := regexp_replace(cleaned, '[^a-z0-9]+', ' ', 'g');

  terms := array(
    select term from unnest(string_to_array(trim(cleaned), ' ')) as term
    where length(term) >= 2
  );

  if terms is null or array_length(terms, 1) is null then
    return null;
  end if;

  return to_tsquery(
    'public.search_tr',
    array_to_string(array(select term || ':*' from unnest(terms) as term), ' & ')
  );
end;
$$;

-- ─── Enum'lar ──────────────────────────────────────────────────────────────
-- Değerler İngilizce; Türkçe karşılıkları arayüzde üretilir (ADR 0005).

do $$
begin
  if not exists (select 1 from pg_type where typname = 'language_code') then
    create type public.language_code as enum ('tr', 'en');
  end if;

  if not exists (select 1 from pg_type where typname = 'content_status') then
    create type public.content_status as enum ('draft', 'published', 'archived');
  end if;

  if not exists (select 1 from pg_type where typname = 'contributor_role') then
    create type public.contributor_role as enum ('author', 'illustrator', 'translator', 'editor');
  end if;

  if not exists (select 1 from pg_type where typname = 'topic_source') then
    create type public.topic_source as enum ('editorial', 'auto');
  end if;

  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum ('member', 'editor', 'admin');
  end if;

  if not exists (select 1 from pg_type where typname = 'child_gender') then
    create type public.child_gender as enum ('girl', 'boy', 'unspecified');
  end if;

  if not exists (select 1 from pg_type where typname = 'library_status') then
    create type public.library_status as enum ('to_read', 'reading', 'read', 'abandoned');
  end if;

  if not exists (select 1 from pg_type where typname = 'reading_mood') then
    create type public.reading_mood as enum ('loved', 'liked', 'ok', 'disliked');
  end if;

  if not exists (select 1 from pg_type where typname = 'note_visibility') then
    create type public.note_visibility as enum ('private', 'family', 'public');
  end if;

  if not exists (select 1 from pg_type where typname = 'book_origin') then
    create type public.book_origin as enum ('catalog', 'camera', 'manual');
  end if;

  if not exists (select 1 from pg_type where typname = 'feedback_topic') then
    create type public.feedback_topic as enum ('feature', 'bug', 'book', 'general');
  end if;

  if not exists (select 1 from pg_type where typname = 'feedback_status') then
    create type public.feedback_status as enum ('new', 'in_review', 'resolved', 'wont_fix');
  end if;

  if not exists (select 1 from pg_type where typname = 'donation_status') then
    create type public.donation_status as enum ('new', 'forwarded', 'completed', 'cancelled');
  end if;

  if not exists (select 1 from pg_type where typname = 'listing_status') then
    create type public.listing_status as enum ('active', 'closed');
  end if;

  if not exists (select 1 from pg_type where typname = 'book_condition') then
    create type public.book_condition as enum ('new', 'good', 'worn');
  end if;
end $$;

-- ─── Ortak tetikleyici: updated_at ─────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Metin yardımcıları ────────────────────────────────────────────────────
-- Türkçe karakterleri sadeleştirip URL'e uygun bir slug üretir.
create or replace function public.slugify(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    lower(translate(
      coalesce(value, ''),
      'ÇĞİÎIÖŞÜÂçğıiîöşüâ',
      'CGIIIOSUAcgiiiosua'
    )),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;
