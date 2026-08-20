-- ═══════════════════════════════════════════════════════════════════════════
-- 0012 — Tetikleyici fonksiyonlarına sahip yetkisi
--
-- SORUN: Tetikleyici fonksiyonları varsayılan olarak ÇAĞIRANIN yetkisiyle
-- çalışır. Bir kullanıcı silindiğinde silme işlemi `supabase_auth_admin`
-- rolüyle yapılır ve zincirleme silme `reading_sessions` tablosuna dokunur;
-- bu rolün `public` şemasında izni olmadığı için silme
-- "permission denied for table reading_sessions" hatasıyla düşer.
--
-- Aynı sorun Supabase panelinden kullanıcı silmeye ve ileride eklenecek
-- "hesabımı sil" akışına da vurur.
--
-- ÇÖZÜM: Türetilmiş alanları güncelleyen tetikleyicileri `security definer`
-- yap. Bu fonksiyonlar yalnızca tetikleyen satırın kendi türetilmiş
-- alanlarını hesaplar; hangi satırlara dokunulabileceğini zaten temel
-- tablonun RLS politikaları belirler.
--
-- `search_path` sabitlenir: definer fonksiyonlarında zorunlu güvenlik önlemi.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.sync_library_item_reading_stats(target_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.sync_library_item_reading_stats(coalesce(new.library_item_id, old.library_item_id));
  return null;
end;
$$;

create or replace function public.refresh_book_search_vector(target_book_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
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
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_book_search_vector(new.id);
  return null;
end;
$$;

create or replace function public.book_contributors_search_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform public.refresh_book_search_vector(coalesce(new.book_id, old.book_id));
  return null;
end;
$$;
