-- ═══════════════════════════════════════════════════════════════════════════
-- 0013 — Fonksiyon sertleştirmesi (Supabase güvenlik denetçisi bulguları)
--
-- İKİ AYRI SORUN:
--
-- 1) `search_path` sabitlenmemiş fonksiyonlar. Çağıranın `search_path`'i
--    geçerli olduğu için, aynı adı taşıyan sahte bir tablo/fonksiyon
--    araya girebilir. Definer olmayan fonksiyonlarda etkisi sınırlı ama
--    denetçi haklı: sabitlemek bedava.
--
-- 2) Yalnızca içeride kullanılan fonksiyonlar REST API'sinde uçtu.
--    PostgreSQL varsayılan olarak her fonksiyona `PUBLIC` için EXECUTE
--    verir; PostgREST de `public` şemasındaki her fonksiyonu
--    `/rest/v1/rpc/<ad>` altında yayımlar. Yani tetikleyici gövdeleri ve
--    türetilmiş alan güncelleyicileri dışarıdan çağrılabilir durumdaydı.
--
-- BİLİNÇLİ OLARAK BIRAKILANLAR: `is_staff`, `is_admin`, `owns_child`,
-- `owns_library_item`. Bunlar RLS politikalarının İÇİNDEN çağrılıyor;
-- politika ifadesi sorgulayan rolün yetkisiyle değerlendirildiği için
-- EXECUTE'u geri almak katalog sayfasını komple kırar. Üçü de yalnızca
-- çağıranın kendi durumunu döndürüyor, sızdırdıkları bir veri yok.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1) search_path sabitleme ──────────────────────────────────────────────

create or replace function public.build_search_query(input text)
returns tsquery
language plpgsql
stable
set search_path = public, extensions, pg_temp
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

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.slugify(value text)
returns text
language sql
immutable
set search_path = pg_temp
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

create or replace function public.child_reading_streak(target_child_id uuid)
returns integer
language sql
stable
set search_path = public, pg_temp
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

create or replace function public.child_points(target_child_id uuid)
returns integer
language sql
stable
set search_path = public, pg_temp
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

-- ─── 2) İç kullanım fonksiyonlarını REST yüzeyinden çıkar ──────────────────
-- Tetikleyiciler EXECUTE yetkisi aramaz (kontrol `create trigger` anında
-- yapılır), definer fonksiyonların içinden yapılan çağrılar da sahibin
-- yetkisiyle çalışır. Dolayısıyla bunları geri almak hiçbir akışı kırmaz.

revoke execute on function public.books_search_vector_trigger()
  from public, anon, authenticated;
revoke execute on function public.book_contributors_search_trigger()
  from public, anon, authenticated;
revoke execute on function public.reading_sessions_sync_trigger()
  from public, anon, authenticated;
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;
revoke execute on function public.refresh_book_search_vector(uuid)
  from public, anon, authenticated;
revoke execute on function public.sync_library_item_reading_stats(uuid)
  from public, anon, authenticated;

-- Bunlar uygulamadan `rpc()` ile çağrılıyor ama yalnızca giriş yapmış
-- kullanıcı için anlamlı; anonim erişimi kapat.
revoke execute on function public.evaluate_child_achievements(uuid) from public, anon;
revoke execute on function public.ai_quota_remaining(text, integer, integer) from public, anon;
revoke execute on function public.child_points(uuid) from public, anon;
revoke execute on function public.child_reading_streak(uuid) from public, anon;

-- `create or replace` yetkileri sıfırladığı için 0011'deki grant'ları tazele.
grant execute on function public.child_points(uuid) to authenticated;
grant execute on function public.child_reading_streak(uuid) to authenticated;
grant execute on function public.build_search_query(text) to anon, authenticated;
