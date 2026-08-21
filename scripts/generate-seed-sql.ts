/**
 * İçerik dosyalarından tohumlama SQL'i üretir.
 *
 *   npm run content:sql            → supabase/seed/ altına yazar
 *
 * `npm run db:sync` ile aynı sonucu verir; farkı, veritabanı bağlantısı
 * gerektirmemesidir. Supabase panelindeki SQL Editor'e yapıştırmak ya da MCP
 * üzerinden çalıştırmak için kullanılır.
 *
 * Üretilen SQL idempotenttir: slug üzerinden upsert eder.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { checkContentConsistency } from '../src/lib/content/schema'
import { loadAllContent } from '../src/lib/content/load'

const OUT_DIR = 'supabase/seed'

/** Metni SQL string sabitine çevirir. */
function lit(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'null'
  return `'${value.replace(/'/g, "''")}'`
}

function num(value: number | null | undefined): string {
  return value === null || value === undefined ? 'null' : String(value)
}

function textArray(values: string[]): string {
  if (values.length === 0) return `'{}'::text[]`
  return `array[${values.map(lit).join(', ')}]::text[]`
}

/** Türkçe karakterleri sadeleştirir (veritabanındaki slugify ile aynı mantık). */
function slugify(value: string): string {
  const map: Record<string, string> = {
    ç: 'c',
    Ç: 'c',
    ğ: 'g',
    Ğ: 'g',
    ı: 'i',
    İ: 'i',
    ö: 'o',
    Ö: 'o',
    ş: 's',
    Ş: 's',
    ü: 'u',
    Ü: 'u',
    â: 'a',
    Â: 'a',
    î: 'i',
  }
  return value
    .replace(/[çÇğĞıİöÖşŞüÜâÂî]/g, (char) => map[char] ?? char)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

const { taxonomy, books, achievements, organizations } = loadAllContent()

const blocking = checkContentConsistency(books, taxonomy).filter((i) => i.level === 'error')
if (blocking.length > 0) {
  console.error('❌ İçerikte hata var:')
  for (const issue of blocking) console.error(`  • ${issue.message}`)
  process.exit(1)
}

// ─── 1. Taksonomi + başarımlar + kurumlar ────────────────────────────────────
const areaRows = taxonomy.developmentAreas.map(
  (area) =>
    `  (${lit(area.slug)}, ${lit(area.name)}, ${lit(area.description)}, ${lit(area.emoji)}, ${lit(area.color)}, ${area.position})`,
)

const topicRows = taxonomy.developmentAreas.flatMap((area) =>
  area.topics.map(
    (topic) =>
      `  (${lit(area.slug)}, ${lit(topic.slug)}, ${lit(topic.name)}, ${lit(topic.label)}, ${lit(topic.description)}, ${textArray(topic.keywords)}, ${topic.position})`,
  ),
)

const interestRows = taxonomy.interests.map(
  (interest) =>
    `  (${lit(interest.slug)}, ${lit(interest.name)}, ${lit(interest.emoji)}, ${textArray(interest.keywords)}, ${interest.position})`,
)

const achievementRows = achievements.map(
  (achievement) =>
    `  (${lit(achievement.slug)}, ${lit(achievement.name)}, ${lit(achievement.description)}, ${lit(achievement.emoji)}, ${lit(JSON.stringify(achievement.criteria))}, ${achievement.points}, ${achievement.position})`,
)

const organizationRows = organizations.map(
  (organization) =>
    `  (${lit(organization.slug)}, ${lit(organization.name)}, ${lit(organization.description)}, ${lit(organization.website)}, ${organization.isActive}, ${organization.position})`,
)

const taxonomyLines: string[] = [
  '-- OTOMATİK ÜRETİLDİ: npm run content:sql',
  '-- Taksonomi, başarımlar ve bağış kurumları. Tekrar çalıştırmak güvenlidir.',
  'begin;',
  '',
  'insert into public.development_areas (slug, name, description, emoji, color, position)',
  'values',
  areaRows.join(',\n'),
  'on conflict (slug) do update set name = excluded.name, description = excluded.description,',
  '  emoji = excluded.emoji, color = excluded.color, position = excluded.position;',
  '',
  'insert into public.development_topics (area_id, slug, name, label, description, keywords, position)',
  'select a.id, v.slug, v.name, v.label, v.description, v.keywords, v.position',
  'from (values',
  topicRows.join(',\n'),
  ') as v (area_slug, slug, name, label, description, keywords, position)',
  'join public.development_areas a on a.slug = v.area_slug',
  'on conflict (slug) do update set area_id = excluded.area_id, name = excluded.name,',
  '  label = excluded.label, description = excluded.description,',
  '  keywords = excluded.keywords, position = excluded.position;',
  '',
  'insert into public.interests (slug, name, emoji, keywords, position)',
  'values',
  interestRows.join(',\n'),
  'on conflict (slug) do update set name = excluded.name, emoji = excluded.emoji,',
  '  keywords = excluded.keywords, position = excluded.position;',
  '',
  'insert into public.achievements (slug, name, description, emoji, criteria, points, position)',
  'select v.slug, v.name, v.description, v.emoji, v.criteria::jsonb, v.points, v.position',
  'from (values',
  achievementRows.join(',\n'),
  ') as v (slug, name, description, emoji, criteria, points, position)',
  'on conflict (slug) do update set name = excluded.name, description = excluded.description,',
  '  emoji = excluded.emoji, criteria = excluded.criteria, points = excluded.points,',
  '  position = excluded.position;',
  '',
  'insert into public.donation_organizations (slug, name, description, website, is_active, position)',
  'values',
  organizationRows.join(',\n'),
  'on conflict (slug) do update set name = excluded.name, description = excluded.description,',
  '  website = excluded.website, is_active = excluded.is_active, position = excluded.position;',
  '',
  'commit;',
]

// ─── 2. Yayınevleri, kişiler, seriler ────────────────────────────────────────
const entityLines: string[] = ['-- OTOMATİK ÜRETİLDİ: npm run content:sql', 'begin;', '']

for (const name of new Set(books.map((b) => b.publisher).filter(Boolean) as string[])) {
  entityLines.push(
    `insert into public.publishers (slug, name) values (${lit(slugify(name))}, ${lit(name)})`,
    `on conflict (slug) do update set name = excluded.name;`,
    '',
  )
}

const people = new Set(books.flatMap((b) => [...b.authors, ...b.illustrators, ...b.translators]))
for (const name of people) {
  entityLines.push(
    `insert into public.people (slug, display_name) values (${lit(slugify(name))}, ${lit(name)})`,
    `on conflict (slug) do update set display_name = excluded.display_name;`,
    '',
  )
}

const seenSeries = new Set<string>()
for (const book of books) {
  if (!book.series || seenSeries.has(book.series.slug)) continue
  seenSeries.add(book.series.slug)
  entityLines.push(
    `insert into public.series (slug, title) values (${lit(book.series.slug)}, ${lit(book.series.title)})`,
    `on conflict (slug) do update set title = excluded.title;`,
    '',
  )
}

entityLines.push('commit;')

// ─── 3. Kitaplar (parçalara bölünmüş) ────────────────────────────────────────
const topicMatchers = taxonomy.developmentAreas.flatMap((area) =>
  area.topics.map((topic) => ({
    slug: topic.slug,
    pattern: new RegExp(topic.keywords.join('|'), 'i'),
  })),
)
const interestMatchers = taxonomy.interests.map((interest) => ({
  slug: interest.slug,
  pattern: new RegExp(interest.keywords.join('|'), 'i'),
}))

let autoTopics = 0
let autoInterests = 0

/** Kitap satırlarını tek bir çok satırlı INSERT olarak yazar. */
function bookRow(book: (typeof books)[number]): string {
  return `  (${lit(book.slug)}, ${lit(book.title)}, ${lit(book.subtitle)}, ${lit(book.originalTitle)}, ${lit(book.summary)}, ${lit(book.description)}, ${lit(book.language)}, ${num(book.ageMin)}, ${num(book.ageMax)}, ${num(book.pageCount)}, ${lit(book.isbn13)}, ${num(book.publishedYear)}, ${lit(book.publisher ? slugify(book.publisher) : null)}, ${lit(book.series?.slug ?? null)}, ${num(book.series?.position ?? null)}, ${lit(book.coverPath)}, ${lit(book.instagram?.url ?? null)}, ${lit(book.instagram?.shortcode ?? null)}, ${book.instagram?.likeCount ?? 0}, ${lit(book.instagram?.postedAt ?? null)}, ${lit(book.status)})`
}

/** (kitap, ilişki) çiftlerini VALUES listesi olarak yazar. */
function pairRows(rows: string[][]): string {
  return rows.map((cells) => `  (${cells.join(', ')})`).join(',\n')
}

interface BookRelations {
  contributors: string[][]
  topics: string[][]
  interests: string[][]
}

function relationsOf(book: (typeof books)[number]): BookRelations {
  const contributors: string[][] = []
  for (const [names, role] of [
    [book.authors, 'author'],
    [book.illustrators, 'illustrator'],
    [book.translators, 'translator'],
  ] as [string[], string][]) {
    for (const [position, name] of names.entries()) {
      contributors.push([lit(book.slug), lit(slugify(name)), lit(role), String(position)])
    }
  }

  const topics = book.topics.map((topic) => [
    lit(book.slug),
    lit(topic.slug),
    String(topic.relevance),
    `'editorial'`,
  ])
  const interests = book.interests.map((slug) => [lit(book.slug), lit(slug), `'editorial'`])

  // Otomatik etiketleme: editör etiketlemediyse anahtar kelimeden çıkarım.
  const haystack = `${book.title} ${book.subtitle ?? ''} ${book.summary}`
  const editorialTopics = new Set(book.topics.map((t) => t.slug))
  for (const matcher of topicMatchers) {
    if (editorialTopics.has(matcher.slug) || !matcher.pattern.test(haystack)) continue
    autoTopics += 1
    topics.push([lit(book.slug), lit(matcher.slug), '2', `'auto'`])
  }

  const editorialInterests = new Set(book.interests)
  for (const matcher of interestMatchers) {
    if (editorialInterests.has(matcher.slug) || !matcher.pattern.test(haystack)) continue
    autoInterests += 1
    interests.push([lit(book.slug), lit(matcher.slug), `'auto'`])
  }

  return { contributors, topics, interests }
}

function chunkSql(slice: typeof books, label: string): string {
  const relations = slice.map(relationsOf)
  const contributors = relations.flatMap((r) => r.contributors)
  const topics = relations.flatMap((r) => r.topics)
  const interests = relations.flatMap((r) => r.interests)
  const slugs = slice.map((book) => lit(book.slug)).join(', ')

  const parts: string[] = [
    `-- OTOMATİK ÜRETİLDİ: npm run content:sql`,
    `-- ${label}`,
    'begin;',
    '',
    `insert into public.books (`,
    `  slug, title, subtitle, original_title, summary, description, language,`,
    `  age_min, age_max, page_count, isbn13, published_year,`,
    `  publisher_id, series_id, series_position, cover_path,`,
    `  instagram_url, instagram_shortcode, like_count, posted_at, status)`,
    // Sayisal sutunlar acikca donusturuluyor: VALUES listesindeki bir sutunun
    // tum degerleri NULL ise Postgres tipi text olarak cikariyor ve hedef
    // sutuna (smallint) uymuyor.
    `select v.slug, v.title, v.subtitle, v.original_title, v.summary, v.description,`,
    `       v.language::public.language_code, v.age_min::smallint, v.age_max::smallint,`,
    `       v.page_count::smallint, v.isbn13::text, v.published_year::smallint,`,
    `       pub.id, ser.id, v.series_position::smallint, v.cover_path::text,`,
    `       v.instagram_url::text, v.instagram_shortcode::text,`,
    `       v.like_count::integer, v.posted_at::date,`,
    `       v.status::public.content_status`,
    `from (values`,
    slice.map(bookRow).join(',\n'),
    `) as v (slug, title, subtitle, original_title, summary, description, language,`,
    `        age_min, age_max, page_count, isbn13, published_year, publisher_slug,`,
    `        series_slug, series_position, cover_path, instagram_url, instagram_shortcode,`,
    `        like_count, posted_at, status)`,
    `left join public.publishers pub on pub.slug = v.publisher_slug`,
    `left join public.series ser on ser.slug = v.series_slug`,
    `on conflict (slug) do update set`,
    `  title = excluded.title, subtitle = excluded.subtitle,`,
    `  original_title = excluded.original_title, summary = excluded.summary,`,
    `  description = excluded.description, language = excluded.language,`,
    `  age_min = excluded.age_min, age_max = excluded.age_max,`,
    `  page_count = excluded.page_count, isbn13 = excluded.isbn13,`,
    `  published_year = excluded.published_year, publisher_id = excluded.publisher_id,`,
    `  series_id = excluded.series_id, series_position = excluded.series_position,`,
    `  cover_path = coalesce(excluded.cover_path, public.books.cover_path),`,
    `  instagram_url = excluded.instagram_url,`,
    `  instagram_shortcode = excluded.instagram_shortcode,`,
    `  like_count = excluded.like_count, posted_at = excluded.posted_at,`,
    `  status = excluded.status;`,
    '',
    `-- İçerik dosyası katkıda bulunanlar ve editoryal etiketler için tek kaynak.`,
    `delete from public.book_contributors bc using public.books b`,
    `where bc.book_id = b.id and b.slug in (${slugs});`,
    `delete from public.book_topics bt using public.books b`,
    `where bt.book_id = b.id and b.slug in (${slugs}) and bt.source = 'editorial';`,
    `delete from public.book_interests bi using public.books b`,
    `where bi.book_id = b.id and b.slug in (${slugs}) and bi.source = 'editorial';`,
    '',
  ]

  if (contributors.length > 0) {
    parts.push(
      `insert into public.book_contributors (book_id, person_id, role, position)`,
      `select b.id, p.id, v.role::public.contributor_role, v.position`,
      `from (values`,
      pairRows(contributors),
      `) as v (book_slug, person_slug, role, position)`,
      `join public.books b on b.slug = v.book_slug`,
      `join public.people p on p.slug = v.person_slug`,
      `on conflict do nothing;`,
      '',
    )
  }

  if (topics.length > 0) {
    parts.push(
      `insert into public.book_topics (book_id, topic_id, relevance, source)`,
      `select b.id, t.id, v.relevance, v.source::public.topic_source`,
      `from (values`,
      pairRows(topics),
      `) as v (book_slug, topic_slug, relevance, source)`,
      `join public.books b on b.slug = v.book_slug`,
      `join public.development_topics t on t.slug = v.topic_slug`,
      `on conflict (book_id, topic_id) do update set`,
      `  relevance = excluded.relevance, source = excluded.source;`,
      '',
    )
  }

  if (interests.length > 0) {
    parts.push(
      `insert into public.book_interests (book_id, interest_id, source)`,
      `select b.id, i.id, v.source::public.topic_source`,
      `from (values`,
      pairRows(interests),
      `) as v (book_slug, interest_slug, source)`,
      `join public.books b on b.slug = v.book_slug`,
      `join public.interests i on i.slug = v.interest_slug`,
      `on conflict (book_id, interest_id) do update set source = excluded.source;`,
      '',
    )
  }

  parts.push('commit;')
  return parts.join('\n') + '\n'
}

mkdirSync(OUT_DIR, { recursive: true })
writeFileSync(`${OUT_DIR}/0001_taxonomy.sql`, taxonomyLines.join('\n') + '\n')
writeFileSync(`${OUT_DIR}/0002_entities.sql`, entityLines.join('\n') + '\n')

const CHUNK = 40
const chunkCount = Math.ceil(books.length / CHUNK)
for (let index = 0; index < chunkCount; index += 1) {
  const slice = books.slice(index * CHUNK, (index + 1) * CHUNK)
  const label = `Kitaplar ${index * CHUNK + 1}–${index * CHUNK + slice.length} / ${books.length}`
  const name = `0003_books_${String(index + 1).padStart(2, '0')}.sql`
  writeFileSync(`${OUT_DIR}/${name}`, chunkSql(slice, label))
}

console.log(`✅ ${OUT_DIR}/ altına yazıldı`)
console.log(`   taksonomi + başarım + kurum : 1 dosya`)
console.log(`   yayınevi/kişi/seri          : 1 dosya`)
console.log(`   kitap                       : ${chunkCount} dosya (${books.length} kitap)`)
console.log(`   otomatik konu etiketi       : ${autoTopics}`)
console.log(`   otomatik ilgi etiketi       : ${autoInterests}`)
