import type { MetadataRoute } from 'next'
import { getPublishedSlugs } from '@/lib/data/catalog'
import { siteUrl } from '@/lib/env'

/**
 * İstek anında üretilir: derleme sırasında veritabanı erişimi olmayabilir
 * (CI) ve o durumda boş bir site haritası kalıcı olarak gömülür. İçerideki
 * sorgu zaten 5 dakika önbelleklidir, bu yüzden her istek veritabanına gitmez.
 */
export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const staticPages = ['', '/giris', '/kayit', '/gorus'].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'weekly' as const,
    priority: path === '' ? 1 : 0.5,
  }))

  const books = await getPublishedSlugs()
  const bookPages = books.map((book) => ({
    url: `${base}/kitap/${book.slug}`,
    lastModified: book.postedAt ? new Date(book.postedAt) : undefined,
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...staticPages, ...bookPages]
}
