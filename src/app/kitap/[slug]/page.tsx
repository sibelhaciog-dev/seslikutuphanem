import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BookDetail } from '@/components/books/BookDetail'
import { getBookBySlug, getCatalog } from '@/lib/data/catalog'

interface PageProps {
  params: Promise<{ slug: string }>
}

/**
 * Rota bilerek DİNAMİK bırakıldı.
 *
 * `revalidate` verildiğinde Next.js sayfayı yerleşimle (layout) birlikte
 * önbelleğe alıyor; yerleşim ise oturumu okuyor. Sonuç: giriş yapmış kullanıcı
 * anonim kullanıcı için üretilmiş kabuğu görüyor — çocuk sekmeleri ve okuma
 * takibi kayboluyordu.
 *
 * Önbellek veri katmanında: `getBookBySlug` ve `getCatalog` `unstable_cache`
 * kullanıyor, yani veritabanına yine her istekte gidilmiyor.
 */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const book = await getBookBySlug(slug)
  if (!book) return { title: 'Kitap bulunamadı' }

  return {
    title: book.title,
    description: book.summary || `${book.title} — çocuk kitabı incelemesi.`,
    alternates: { canonical: `/kitap/${book.slug}` },
    openGraph: {
      title: book.title,
      description: book.summary,
      type: 'article',
      url: `/kitap/${book.slug}`,
    },
  }
}

export default async function BookPage({ params }: PageProps) {
  const { slug } = await params
  const [book, catalog] = await Promise.all([getBookBySlug(slug), getCatalog()])
  if (!book) notFound()

  return <BookDetail book={book} catalog={catalog} />
}
