/**
 * İçerik dosyalarını veritabanına aktarır (ADR 0002).
 *
 *   DATABASE_URL=postgres://… npm run db:sync
 *   DATABASE_URL=…            npm run db:sync -- --prune
 *
 * `DATABASE_URL`, Supabase panelinde Project Settings → Database → Connection
 * string (URI) değeridir. Yerel testte `npm run db:sync:local` kullanılır.
 *
 * Betik idempotenttir: slug üzerinden upsert eder, defalarca çalıştırılabilir.
 * `--prune` verilirse içerik dosyalarında olmayan katalog kayıtları arşivlenir.
 */
import { Client } from 'pg'
import { checkContentConsistency } from '../src/lib/content/schema'
import { loadAllContent } from '../src/lib/content/load'

const PRUNE = process.argv.includes('--prune')

function requireConnectionString(): string {
  const value = process.env.DATABASE_URL
  if (!value) {
    console.error('DATABASE_URL tanımlı değil.')
    console.error('Supabase → Project Settings → Database → Connection string (URI)')
    process.exit(1)
  }
  return value
}

const connectionString = requireConnectionString()

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

async function main() {
  const { taxonomy, books, achievements, organizations } = loadAllContent()

  const blocking = checkContentConsistency(books, taxonomy).filter(
    (issue) => issue.level === 'error',
  )
  if (blocking.length > 0) {
    console.error('❌ İçerikte hata var, senkronizasyon durduruldu:')
    for (const issue of blocking) console.error(`  • ${issue.message}`)
    process.exit(1)
  }

  const client = new Client({
    connectionString,
    // Supabase bağlantıları TLS ister; yerel Docker istemez.
    ssl: connectionString.includes('supabase.') ? { rejectUnauthorized: false } : undefined,
  })
  await client.connect()

  try {
    await client.query('begin')

    // ─── Taksonomi ────────────────────────────────────────────────────────
    const areaIds = new Map<string, string>()
    for (const area of taxonomy.developmentAreas) {
      const { rows } = await client.query<{ id: string }>(
        `insert into development_areas (slug, name, description, emoji, color, position)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (slug) do update set
           name = excluded.name, description = excluded.description,
           emoji = excluded.emoji, color = excluded.color, position = excluded.position
         returning id`,
        [area.slug, area.name, area.description, area.emoji, area.color, area.position],
      )
      areaIds.set(area.slug, rows[0]!.id)
    }

    const topicIds = new Map<string, string>()
    for (const area of taxonomy.developmentAreas) {
      for (const topic of area.topics) {
        const { rows } = await client.query<{ id: string }>(
          `insert into development_topics (area_id, slug, name, label, description, keywords, position)
           values ($1, $2, $3, $4, $5, $6, $7)
           on conflict (slug) do update set
             area_id = excluded.area_id, name = excluded.name, label = excluded.label,
             description = excluded.description, keywords = excluded.keywords,
             position = excluded.position
           returning id`,
          [
            areaIds.get(area.slug),
            topic.slug,
            topic.name,
            topic.label,
            topic.description,
            topic.keywords,
            topic.position,
          ],
        )
        topicIds.set(topic.slug, rows[0]!.id)
      }
    }

    const interestIds = new Map<string, string>()
    for (const interest of taxonomy.interests) {
      const { rows } = await client.query<{ id: string }>(
        `insert into interests (slug, name, emoji, keywords, position)
         values ($1, $2, $3, $4, $5)
         on conflict (slug) do update set
           name = excluded.name, emoji = excluded.emoji,
           keywords = excluded.keywords, position = excluded.position
         returning id`,
        [interest.slug, interest.name, interest.emoji, interest.keywords, interest.position],
      )
      interestIds.set(interest.slug, rows[0]!.id)
    }

    // ─── Başarımlar ve kurumlar ───────────────────────────────────────────
    for (const achievement of achievements) {
      await client.query(
        `insert into achievements (slug, name, description, emoji, criteria, points, position)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (slug) do update set
           name = excluded.name, description = excluded.description, emoji = excluded.emoji,
           criteria = excluded.criteria, points = excluded.points, position = excluded.position`,
        [
          achievement.slug,
          achievement.name,
          achievement.description,
          achievement.emoji,
          JSON.stringify(achievement.criteria),
          achievement.points,
          achievement.position,
        ],
      )
    }

    for (const organization of organizations) {
      await client.query(
        `insert into donation_organizations (slug, name, description, website, is_active, position)
         values ($1, $2, $3, $4, $5, $6)
         on conflict (slug) do update set
           name = excluded.name, description = excluded.description, website = excluded.website,
           is_active = excluded.is_active, position = excluded.position`,
        [
          organization.slug,
          organization.name,
          organization.description,
          organization.website,
          organization.isActive,
          organization.position,
        ],
      )
    }

    // ─── Yayınevleri, kişiler, seriler ────────────────────────────────────
    const publisherIds = new Map<string, string>()
    for (const name of new Set(books.map((book) => book.publisher).filter(Boolean) as string[])) {
      const { rows } = await client.query<{ id: string }>(
        `insert into publishers (slug, name) values ($1, $2)
         on conflict (slug) do update set name = excluded.name
         returning id`,
        [slugify(name), name],
      )
      publisherIds.set(name, rows[0]!.id)
    }

    const personIds = new Map<string, string>()
    const allPeople = new Set(
      books.flatMap((book) => [...book.authors, ...book.illustrators, ...book.translators]),
    )
    for (const name of allPeople) {
      const { rows } = await client.query<{ id: string }>(
        `insert into people (slug, display_name) values ($1, $2)
         on conflict (slug) do update set display_name = excluded.display_name
         returning id`,
        [slugify(name), name],
      )
      personIds.set(name, rows[0]!.id)
    }

    const seriesIds = new Map<string, string>()
    for (const book of books) {
      if (!book.series || seriesIds.has(book.series.slug)) continue
      const { rows } = await client.query<{ id: string }>(
        `insert into series (slug, title) values ($1, $2)
         on conflict (slug) do update set title = excluded.title
         returning id`,
        [book.series.slug, book.series.title],
      )
      seriesIds.set(book.series.slug, rows[0]!.id)
    }

    // ─── Otomatik etiketleme için desenler ────────────────────────────────
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

    // ─── Kitaplar ─────────────────────────────────────────────────────────
    let autoTopics = 0
    let autoInterests = 0

    for (const book of books) {
      const { rows } = await client.query<{ id: string }>(
        `insert into books (
           slug, title, subtitle, original_title, summary, description, language,
           age_min, age_max, page_count, isbn13, published_year,
           publisher_id, series_id, series_position,
           cover_path, instagram_url, instagram_shortcode, like_count, posted_at, status
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
         on conflict (slug) do update set
           title = excluded.title, subtitle = excluded.subtitle,
           original_title = excluded.original_title, summary = excluded.summary,
           description = excluded.description, language = excluded.language,
           age_min = excluded.age_min, age_max = excluded.age_max,
           page_count = excluded.page_count, isbn13 = excluded.isbn13,
           published_year = excluded.published_year, publisher_id = excluded.publisher_id,
           series_id = excluded.series_id, series_position = excluded.series_position,
           cover_path = coalesce(excluded.cover_path, books.cover_path),
           instagram_url = excluded.instagram_url,
           instagram_shortcode = excluded.instagram_shortcode,
           like_count = excluded.like_count, posted_at = excluded.posted_at,
           status = excluded.status
         returning id`,
        [
          book.slug,
          book.title,
          book.subtitle,
          book.originalTitle,
          book.summary,
          book.description,
          book.language,
          book.ageMin,
          book.ageMax,
          book.pageCount,
          book.isbn13,
          book.publishedYear,
          book.publisher ? publisherIds.get(book.publisher) : null,
          book.series ? seriesIds.get(book.series.slug) : null,
          book.series?.position ?? null,
          book.coverPath,
          book.instagram?.url ?? null,
          book.instagram?.shortcode ?? null,
          book.instagram?.likeCount ?? 0,
          book.instagram?.postedAt ?? null,
          book.status,
        ],
      )
      const bookId = rows[0]!.id

      // Katkıda bulunanlar: içerik dosyası tek doğru kaynak.
      await client.query('delete from book_contributors where book_id = $1', [bookId])
      const contributors: [string[], string][] = [
        [book.authors, 'author'],
        [book.illustrators, 'illustrator'],
        [book.translators, 'translator'],
      ]
      for (const [names, role] of contributors) {
        for (const [position, name] of names.entries()) {
          await client.query(
            `insert into book_contributors (book_id, person_id, role, position)
             values ($1, $2, $3, $4) on conflict do nothing`,
            [bookId, personIds.get(name), role, position],
          )
        }
      }

      // Editoryal etiketler yeniden yazılır; otomatik olanlar korunur.
      await client.query(`delete from book_topics where book_id = $1 and source = 'editorial'`, [
        bookId,
      ])
      for (const topic of book.topics) {
        await client.query(
          `insert into book_topics (book_id, topic_id, relevance, source)
           values ($1, $2, $3, 'editorial')
           on conflict (book_id, topic_id) do update set
             relevance = excluded.relevance, source = 'editorial'`,
          [bookId, topicIds.get(topic.slug), topic.relevance],
        )
      }

      await client.query(`delete from book_interests where book_id = $1 and source = 'editorial'`, [
        bookId,
      ])
      for (const interestSlug of book.interests) {
        await client.query(
          `insert into book_interests (book_id, interest_id, source)
           values ($1, $2, 'editorial')
           on conflict (book_id, interest_id) do update set source = 'editorial'`,
          [bookId, interestIds.get(interestSlug)],
        )
      }

      // ─── Otomatik etiketleme ────────────────────────────────────────────
      // Editör etiketlemediyse anahtar kelimeden çıkarım yapılır; böylece yeni
      // eklenen kitaplar da rehber filtrelerinde görünür.
      const haystack = `${book.title} ${book.subtitle ?? ''} ${book.summary}`
      const editorialTopics = new Set(book.topics.map((topic) => topic.slug))

      for (const matcher of topicMatchers) {
        if (editorialTopics.has(matcher.slug)) continue
        if (!matcher.pattern.test(haystack)) continue
        const result = await client.query(
          `insert into book_topics (book_id, topic_id, relevance, source)
           values ($1, $2, 2, 'auto') on conflict (book_id, topic_id) do nothing`,
          [bookId, topicIds.get(matcher.slug)],
        )
        autoTopics += result.rowCount ?? 0
      }

      const editorialInterests = new Set(book.interests)
      for (const matcher of interestMatchers) {
        if (editorialInterests.has(matcher.slug)) continue
        if (!matcher.pattern.test(haystack)) continue
        const result = await client.query(
          `insert into book_interests (book_id, interest_id, source)
           values ($1, $2, 'auto') on conflict (book_id, interest_id) do nothing`,
          [bookId, interestIds.get(matcher.slug)],
        )
        autoInterests += result.rowCount ?? 0
      }
    }

    // ─── Artık içerikte olmayan kitaplar ──────────────────────────────────
    const slugs = books.map((book) => book.slug)
    const { rows: orphans } = await client.query<{ slug: string }>(
      `select slug from books where not (slug = any($1)) and status <> 'archived'`,
      [slugs],
    )

    if (orphans.length > 0) {
      if (PRUNE) {
        await client.query(`update books set status = 'archived' where not (slug = any($1))`, [
          slugs,
        ])
        console.log(`🗄️  ${orphans.length} kitap arşivlendi (içerik dosyasında yok).`)
      } else {
        console.log(
          `⚠️  ${orphans.length} kitap içerik dosyasında yok; arşivlemek için --prune kullanın:`,
        )
        for (const orphan of orphans.slice(0, 10)) console.log(`    • ${orphan.slug}`)
      }
    }

    await client.query('commit')

    const { rows: counts } = await client.query<{ table_name: string; total: string }>(`
      select 'books' as table_name, count(*)::text as total from books
      union all select 'book_topics', count(*)::text from book_topics
      union all select 'book_interests', count(*)::text from book_interests
      union all select 'development_topics', count(*)::text from development_topics
      union all select 'achievements', count(*)::text from achievements
      order by 1
    `)

    console.log('\n✅ Senkronizasyon tamam')
    for (const row of counts) {
      console.log(`   ${row.table_name.padEnd(20)} ${row.total}`)
    }
    console.log(`   otomatik konu etiketi   +${autoTopics}`)
    console.log(`   otomatik ilgi etiketi   +${autoInterests}`)
  } catch (error) {
    await client.query('rollback')
    throw error
  } finally {
    await client.end()
  }
}

main().catch((error) => {
  console.error('❌ Senkronizasyon başarısız:', error instanceof Error ? error.message : error)
  process.exit(1)
})
