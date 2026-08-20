/**
 * TEK SEFERLİK dönüştürücü: v1 `src/data/books.json` → v2 `content/books.json`
 *
 * Bu betik yalnızca geçiş için yazıldı ve bir kez çalıştırıldı. Kaynak dosya
 * kaldırıldıktan sonra silinebilir; referans olsun diye tutuluyor.
 *
 *   npx tsx scripts/migrate-books-to-v2.ts
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { taxonomySchema, type BookContent } from '../src/lib/content/schema'

interface LegacyBook {
  id: string
  title: string
  summary: string
  language: 'tr' | 'en'
  ageGroup: string
  ageLabel: string | null
  minAge: number | null
  maxAge: number | null
  likes: number
  postedAt: string | null
  instagramUrl: string
  imageUrl: string | null
  developmentTags: { area: string; topic: string }[]
}

const legacy: LegacyBook[] = JSON.parse(readFileSync('src/data/books.json', 'utf8'))
const taxonomy = taxonomySchema.parse(JSON.parse(readFileSync('content/taxonomy.json', 'utf8')))

/** Türkçe karakterleri sadeleştirip URL'e uygun bir slug üretir. */
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
    ê: 'e',
  }
  return value
    .replace(/[çÇğĞıİöÖşŞüÜâÂîê]/g, (char) => map[char] ?? char)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100)
}

/** v1 alan kimliği → v2 alan slug'ı. */
const AREA_ALIASES: Record<string, string> = {
  degisim: 'degisim',
  zorkonular: 'zor-konular',
  duygu: 'duygu',
  sosyal: 'sosyal',
  ozelilgi: 'ozel-ilgi',
  eglence: 'eglence',
  okul: 'okul',
  etkinlik: 'etkinlik',
}

// Konu adından slug'a: "Sosyal Sınırlar" → "sosyal-sinirlar"
const topicSlugByName = new Map<string, string>()
for (const area of taxonomy.developmentAreas) {
  for (const topic of area.topics) {
    topicSlugByName.set(`${area.slug}::${topic.name}`, topic.slug)
  }
}

/**
 * v1 yaş grubu → sayısal aralık.
 * "+" ekleri "ve üzeri" demek; üst sınır resimli kitap normlarına göre tahmin
 * ediliyor. Açıkça verilmiş min/max varsa onlar tercih edilir.
 */
const AGE_RANGES: Record<string, [number, number]> = {
  '0-6': [0, 6],
  '2+': [2, 6],
  '4+': [4, 8],
  '7+': [7, 12],
}

const usedSlugs = new Set<string>()
function uniqueSlug(base: string): string {
  let candidate = base || 'kitap'
  let counter = 2
  while (usedSlugs.has(candidate)) {
    candidate = `${base}-${counter}`
    counter += 1
  }
  usedSlugs.add(candidate)
  return candidate
}

/** Başlıklardaki baştaki emoji ve "|" sonrası alt başlığı ayırır. */
function splitTitle(raw: string): { title: string; subtitle: string | null } {
  const cleaned = raw.replace(/^[^\p{L}\p{N}]+/u, '').trim()
  const [first, ...rest] = cleaned.split('|')
  return {
    title: (first ?? cleaned).trim(),
    subtitle: rest.length > 0 ? rest.join('|').trim() || null : null,
  }
}

function shortcodeOf(url: string): string | null {
  return url.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#]+)/)?.[1] ?? null
}

const books: BookContent[] = legacy.map((item) => {
  const { title, subtitle } = splitTitle(item.title)
  const range = AGE_RANGES[item.ageGroup]
  const ageMin = item.minAge ?? range?.[0] ?? null
  const ageMax = item.maxAge ?? range?.[1] ?? null
  const shortcode = shortcodeOf(item.instagramUrl)

  const topics = item.developmentTags
    .map((tag) => {
      const areaSlug = AREA_ALIASES[tag.area]
      if (!areaSlug) return null
      const topicSlug = topicSlugByName.get(`${areaSlug}::${tag.topic}`)
      if (!topicSlug) return null
      // v1 etiketleri elle konmuştu; editoryal kabul ediliyor.
      return { slug: topicSlug, relevance: 4 }
    })
    .filter((topic): topic is { slug: string; relevance: number } => topic !== null)

  return {
    slug: uniqueSlug(slugify(title)),
    title,
    subtitle,
    originalTitle: null,
    summary: item.summary.trim(),
    description: null,
    language: item.language,
    ageMin,
    ageMax,
    pageCount: null,
    isbn13: null,
    publishedYear: null,
    publisher: null,
    series: null,
    authors: [],
    illustrators: [],
    translators: [],
    instagram: shortcode
      ? {
          url: item.instagramUrl,
          shortcode,
          postedAt: item.postedAt,
          likeCount: item.likes,
        }
      : null,
    coverPath: null,
    status: 'published',
    topics,
    interests: [],
  }
})

books.sort((a, b) => (b.instagram?.postedAt ?? '').localeCompare(a.instagram?.postedAt ?? ''))

writeFileSync('content/books.json', JSON.stringify(books, null, 2) + '\n')

const withTopics = books.filter((book) => book.topics.length > 0).length
console.log(`${books.length} kitap yazıldı → content/books.json`)
console.log(`  editoryal konu etiketi olan: ${withTopics}`)
console.log(`  yaş aralığı olan: ${books.filter((b) => b.ageMin !== null).length}`)
console.log(`  alt başlığı olan: ${books.filter((b) => b.subtitle).length}`)
