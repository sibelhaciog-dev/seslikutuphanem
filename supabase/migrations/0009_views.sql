-- ═══════════════════════════════════════════════════════════════════════════
-- 0009 — Okuma görünümleri
--
-- `security_invoker = on`: görünümler çağıran kullanıcının yetkisiyle çalışır,
-- yani alttaki tabloların RLS politikaları geçerli kalır. Bu olmadan görünüm
-- RLS'i baypas eder ve taslak kitaplar herkese görünür.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Katalog listesi ───────────────────────────────────────────────────────
-- Ana sayfa bunun tamamını bir kez çeker (~200 satır) ve filtrelemeyi istemci
-- tarafında yapar; böylece arama/filtre anında tepki verir.
create view public.catalog_books
with (security_invoker = on)
as
select
  b.id,
  b.slug,
  b.title,
  b.subtitle,
  b.summary,
  b.language,
  b.age_min,
  b.age_max,
  b.cover_path,
  b.instagram_url,
  b.like_count,
  b.posted_at,
  b.status,
  coalesce(
    (select array_agg(p.display_name order by bc.position, p.display_name)
     from public.book_contributors bc
     join public.people p on p.id = bc.person_id
     where bc.book_id = b.id and bc.role = 'author'),
    '{}'
  ) as author_names,
  coalesce(
    (select array_agg(distinct dt.slug)
     from public.book_topics bt
     join public.development_topics dt on dt.id = bt.topic_id
     where bt.book_id = b.id),
    '{}'
  ) as topic_slugs,
  coalesce(
    (select array_agg(distinct da.slug)
     from public.book_topics bt
     join public.development_topics dt on dt.id = bt.topic_id
     join public.development_areas da on da.id = dt.area_id
     where bt.book_id = b.id),
    '{}'
  ) as area_slugs,
  coalesce(
    (select array_agg(distinct i.slug)
     from public.book_interests bi
     join public.interests i on i.id = bi.interest_id
     where bi.book_id = b.id),
    '{}'
  ) as interest_slugs
from public.books b;

-- ─── Tek kitap sayfası ─────────────────────────────────────────────────────
create view public.book_details
with (security_invoker = on)
as
select
  b.*,
  pub.name as publisher_name,
  pub.slug as publisher_slug,
  s.title as series_title,
  s.slug as series_slug,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
       'slug', p.slug, 'name', p.display_name, 'role', bc.role
     ) order by bc.role, bc.position)
     from public.book_contributors bc
     join public.people p on p.id = bc.person_id
     where bc.book_id = b.id),
    '[]'::jsonb
  ) as contributors,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
       'topicSlug', dt.slug, 'topicName', dt.name,
       'areaSlug', da.slug, 'areaName', da.name,
       'emoji', da.emoji, 'color', da.color,
       'relevance', bt.relevance
     ) order by bt.relevance desc, dt.position)
     from public.book_topics bt
     join public.development_topics dt on dt.id = bt.topic_id
     join public.development_areas da on da.id = dt.area_id
     where bt.book_id = b.id),
    '[]'::jsonb
  ) as topics
from public.books b
left join public.publishers pub on pub.id = b.publisher_id
left join public.series s on s.id = b.series_id;

-- ─── Çocuk okuma özeti ─────────────────────────────────────────────────────
create view public.child_reading_stats
with (security_invoker = on)
as
select
  c.id as child_id,
  c.owner_id,
  count(*) filter (where li.status = 'read') as books_read,
  count(*) filter (where li.status = 'to_read') as books_to_read,
  count(*) filter (where li.is_favorite) as favorites,
  count(*) filter (where li.rating > 0) as rated_books,
  coalesce(avg(li.rating) filter (where li.rating > 0), 0)::numeric(3, 2) as average_rating,
  coalesce(sum(li.times_read), 0) as total_sessions,
  max(li.last_read_at) as last_read_at
from public.children c
left join public.library_items li on li.child_id = c.id
group by c.id, c.owner_id;
