import { unstable_cache } from 'next/cache'
import { createPublicClient } from '@/lib/supabase/public'
import type { AreaView, BookDetail, CatalogBook, InterestView } from './types'

/**
 * Katalog ve taksonomi okumaları.
 *
 * Bu veriler herkese açık ve nadiren değişiyor; oturumsuz istemciyle okunup
 * önbelleğe alınıyorlar (ADR 0002). İçerik senkronizasyonundan sonra önbellek
 * `revalidateTag('catalog')` ile temizlenir.
 */

export const CATALOG_TAG = 'catalog'
const CACHE_SECONDS = 300

/** Depolama yolunu tam adrese çevirir. */
function coverUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const bucket = path.startsWith('user-covers/') ? 'user-covers' : 'catalog-covers'
  const objectPath = path.replace(/^(catalog-covers|user-covers)\//, '')
  return createPublicClient().storage.from(bucket).getPublicUrl(objectPath).data.publicUrl
}

async function fetchCatalog(): Promise<CatalogBook[]> {
  const { data, error } = await createPublicClient()
    .from('catalog_books')
    .select('*')
    .eq('status', 'published')
    .order('posted_at', { ascending: false, nullsFirst: false })

  if (error) throw new Error(`Katalog okunamadı: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id!,
    slug: row.slug!,
    title: row.title!,
    subtitle: row.subtitle,
    summary: row.summary ?? '',
    language: (row.language ?? 'tr') as CatalogBook['language'],
    ageMin: row.age_min,
    ageMax: row.age_max,
    coverUrl: coverUrl(row.cover_path),
    instagramUrl: row.instagram_url,
    likeCount: row.like_count ?? 0,
    postedAt: row.posted_at,
    authors: row.author_names ?? [],
    topicSlugs: row.topic_slugs ?? [],
    areaSlugs: row.area_slugs ?? [],
    interestSlugs: row.interest_slugs ?? [],
  }))
}

async function fetchTaxonomy(): Promise<{ areas: AreaView[]; interests: InterestView[] }> {
  const supabase = createPublicClient()
  const [{ data: areas, error: areaError }, { data: interests, error: interestError }] =
    await Promise.all([
      supabase
        .from('development_areas')
        .select(
          'slug, name, emoji, color, position, development_topics(slug, name, label, position)',
        )
        .order('position'),
      supabase.from('interests').select('slug, name, emoji').order('position'),
    ])

  if (areaError) throw new Error(`Rehberler okunamadı: ${areaError.message}`)
  if (interestError) throw new Error(`İlgi alanları okunamadı: ${interestError.message}`)

  return {
    areas: (areas ?? []).map((area) => ({
      slug: area.slug,
      name: area.name,
      emoji: area.emoji,
      color: area.color,
      position: area.position,
      topics: (area.development_topics ?? [])
        .map((topic) => ({
          slug: topic.slug,
          name: topic.name,
          label: topic.label,
          position: topic.position,
        }))
        .sort((a, b) => a.position - b.position),
    })),
    interests: (interests ?? []).map((interest) => ({
      slug: interest.slug,
      name: interest.name,
      emoji: interest.emoji,
    })),
  }
}

export const getCatalog = unstable_cache(fetchCatalog, ['catalog-books'], {
  revalidate: CACHE_SECONDS,
  tags: [CATALOG_TAG],
})

const cachedTaxonomy = unstable_cache(fetchTaxonomy, ['taxonomy'], {
  revalidate: CACHE_SECONDS,
  tags: [CATALOG_TAG],
})

const EMPTY_TAXONOMY: { areas: AreaView[]; interests: InterestView[] } = {
  areas: [],
  interests: [],
}

/**
 * Taksonomi kök yerleşimde (layout) okunuyor; buradaki bir hata TÜM sayfaları
 * düşürür — giriş sayfası dahil. Bu yüzden hata yutulur ve boş taksonomi
 * dönülür: rehber menüsü görünmez ama site ayakta kalır.
 *
 * Hata yakalama önbelleğin DIŞINDA: başarısız sonuç 5 dakika boyunca
 * önbelleğe alınmasın diye.
 */
export async function getTaxonomy() {
  try {
    return await cachedTaxonomy()
  } catch (error) {
    console.error('Taksonomi okunamadı, boş liste ile devam ediliyor:', error)
    return EMPTY_TAXONOMY
  }
}

async function fetchBookBySlug(slug: string): Promise<BookDetail | null> {
  const { data, error } = await createPublicClient()
    .from('book_details')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  if (error) throw new Error(`Kitap okunamadı: ${error.message}`)
  if (!data || data.status !== 'published') return null

  const contributors = Array.isArray(data.contributors)
    ? (data.contributors as unknown as BookDetail['contributors'])
    : []
  const topics = Array.isArray(data.topics) ? (data.topics as unknown as BookDetail['topics']) : []

  return {
    id: data.id!,
    slug: data.slug!,
    title: data.title!,
    subtitle: data.subtitle,
    summary: data.summary ?? '',
    description: data.description,
    originalTitle: data.original_title,
    language: (data.language ?? 'tr') as BookDetail['language'],
    ageMin: data.age_min,
    ageMax: data.age_max,
    pageCount: data.page_count,
    publishedYear: data.published_year,
    isbn13: data.isbn13,
    coverUrl: coverUrl(data.cover_path),
    instagramUrl: data.instagram_url,
    likeCount: data.like_count ?? 0,
    postedAt: data.posted_at,
    publisherName: data.publisher_name,
    seriesTitle: data.series_title,
    seriesSlug: data.series_slug,
    authors: contributors.filter((person) => person.role === 'author').map((person) => person.name),
    contributors,
    topics,
    topicSlugs: topics.map((topic) => topic.topicSlug),
    areaSlugs: [...new Set(topics.map((topic) => topic.areaSlug))],
    interestSlugs: [],
  }
}

export function getBookBySlug(slug: string) {
  return unstable_cache(() => fetchBookBySlug(slug), ['book', slug], {
    revalidate: CACHE_SECONDS,
    tags: [CATALOG_TAG, `book:${slug}`],
  })()
}

/** Yayındaki tüm kitap slug'ları — site haritası için. */
export const getPublishedSlugs = unstable_cache(
  async (): Promise<{ slug: string; postedAt: string | null }[]> => {
    const { data } = await createPublicClient()
      .from('books')
      .select('slug, posted_at')
      .eq('status', 'published')
    return (data ?? []).map((row) => ({ slug: row.slug, postedAt: row.posted_at }))
  },
  ['published-slugs'],
  { revalidate: CACHE_SECONDS, tags: [CATALOG_TAG] },
)
