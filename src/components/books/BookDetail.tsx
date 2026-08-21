'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { BookCover } from '@/components/books/BookCover'
import { ReadingNotes } from '@/components/books/ReadingNotes'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button, ButtonLink } from '@/components/ui/Button'
import { StarRating } from '@/components/ui/StarRating'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import type { BookDetail as BookDetailType, CatalogBook, LibraryStatus } from '@/lib/data/types'
import {
  ageLabel,
  CONTRIBUTOR_ROLE_LABELS,
  LANGUAGE_LABELS,
  LIBRARY_STATUS_LABELS,
} from '@/lib/labels'
import { similarBooks, type Recommendation } from '@/lib/recommendations'

const STATUS_OPTIONS: LibraryStatus[] = ['to_read', 'reading', 'read', 'abandoned']

export function BookDetail({ book, catalog }: { book: BookDetailType; catalog: CatalogBook[] }) {
  const { activeChild, library, taxonomy, setStatus, toggleFavorite, setRating, logSession } =
    useAppData()
  const toast = useToast()
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null)
  const [pending, setPending] = useState(false)

  const item = library[book.id]
  const age = ageLabel(book.ageMin, book.ageMax)

  /**
   * İstek sürerken ikinci bir istek başlatmaz.
   *
   * Hızlı üç tıklama üç ayrı okuma oturumu kaydediyordu ve türetilen
   * "kaç kez okundu" sayacı yarış durumuna girip yanlış değerde kalıyordu
   * (bkz. 0017). Kullanıcı açısından da bir tıklama bir okuma demek.
   */
  async function safely(action: () => Promise<void>, successMessage?: string) {
    if (pending) return
    setPending(true)
    try {
      await action()
      if (successMessage) toast.show(successMessage)
    } catch {
      toast.show('Kaydedilemedi, bağlantını kontrol et.', 'error')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-7">
      <Link href="/" className="mb-5 inline-block text-sm font-semibold text-accent">
        ← Tüm kitaplar
      </Link>

      <article className="overflow-hidden rounded-panel border border-line bg-white">
        <div className="flex flex-col gap-5 p-5 sm:flex-row">
          <div className="w-28 shrink-0 overflow-hidden rounded-xl border border-line sm:w-36">
            <div className="aspect-2/3">
              <BookCover title={book.title} src={book.coverUrl} />
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-2.5 flex flex-wrap gap-1.5">
              {age && <Badge className="bg-[#F2F2F7] text-ink-soft">{age}</Badge>}
              <Badge className="bg-[#E8F4FD] text-[#007AFF]">
                {LANGUAGE_LABELS[book.language]}
              </Badge>
              <Badge className="bg-accent-soft text-accent">❤️ {book.likeCount}</Badge>
              {book.pageCount && (
                <Badge className="bg-[#F2F2F7] text-ink-soft">{book.pageCount} sayfa</Badge>
              )}
            </div>

            <h1 className="mb-1 text-2xl leading-tight">{book.title}</h1>
            {book.subtitle && <p className="mb-2 text-sm text-muted">{book.subtitle}</p>}

            {book.contributors.length > 0 && (
              <p className="mb-3 text-sm text-ink-soft">
                {book.contributors
                  .map(
                    (person) =>
                      `${person.name} (${CONTRIBUTOR_ROLE_LABELS[person.role] ?? person.role})`,
                  )
                  .join(' · ')}
              </p>
            )}

            {book.summary && (
              <p className="text-sm leading-relaxed text-ink-soft">{book.summary}</p>
            )}
            {book.description && (
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{book.description}</p>
            )}

            {(book.publisherName || book.seriesTitle) && (
              <p className="mt-3 text-xs text-muted">
                {book.publisherName && <span>🏢 {book.publisherName}</span>}
                {book.publisherName && book.seriesTitle && ' · '}
                {book.seriesTitle && <span>📚 {book.seriesTitle} serisi</span>}
              </p>
            )}

            {book.topics.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-1.5">
                {book.topics.slice(0, 6).map((topic) => (
                  <li key={topic.topicSlug}>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        backgroundColor: `${topic.color}1a`,
                        color: topic.color,
                      }}
                      title={topic.areaName}
                    >
                      {topic.emoji} {topic.topicName}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {book.instagramUrl && (
              <div className="mt-5">
                <ButtonLink href={book.instagramUrl} variant="instagram" external>
                  ▶ Tanıtımı izle
                </ButtonLink>
              </div>
            )}
          </div>
        </div>

        {activeChild && (
          <section className="border-t border-line p-5">
            <h2 className="mb-3 text-xs font-bold tracking-wider text-muted uppercase">
              📖 {activeChild.name} için okuma takibi
            </h2>

            <div className="mb-4 flex flex-wrap gap-2">
              {STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  aria-pressed={item?.status === status}
                  onClick={() => void safely(() => setStatus(book.id, status))}
                  className={cn(
                    'rounded-full border-[1.5px] px-3.5 py-1.5 text-[13px] font-semibold transition-colors',
                    item?.status === status
                      ? 'border-accent bg-accent text-white'
                      : 'border-line text-ink-soft hover:border-accent hover:text-accent',
                  )}
                >
                  {LIBRARY_STATUS_LABELS[status]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <StarRating
                value={item?.rating ?? 0}
                onChange={(rating) => void safely(() => setRating(book.id, rating))}
              />
              <Button
                variant="secondary"
                disabled={pending}
                aria-pressed={item?.isFavorite ?? false}
                onClick={() => void safely(() => toggleFavorite(book.id))}
                className={cn(item?.isFavorite && 'border-[#ff3b30] bg-danger-soft')}
              >
                {item?.isFavorite ? '❤️ Favorilerde' : '🤍 Favorilere ekle'}
              </Button>
              <Button
                disabled={pending}
                onClick={() =>
                  void safely(() => logSession(book.id), 'Okuma kaydedildi. Tekrar okumak sayılır!')
                }
              >
                {pending ? 'Kaydediliyor…' : '+ Bugün okuduk'}
              </Button>
            </div>

            {item && item.timesRead > 0 && (
              <p className="mt-3 text-xs text-muted">
                {item.timesRead} kez okundu
                {item.lastReadAt &&
                  ` · son okuma ${new Date(`${item.lastReadAt}T12:00:00`).toLocaleDateString('tr-TR')}`}
              </p>
            )}
          </section>
        )}

        <section className="border-t border-line p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xs font-bold tracking-wider text-muted uppercase">
              ✨ Bunu sevdiyseniz
            </h2>
            <Button
              size="sm"
              onClick={() => setRecommendations(similarBooks(book, catalog, library, taxonomy))}
            >
              Öneri üret
            </Button>
          </div>

          {recommendations !== null &&
            (recommendations.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                Benzer kitap bulunamadı. Birkaç kitabı okundu işaretleyip tekrar deneyin.
              </p>
            ) : (
              <ul className="mt-3 divide-y divide-line">
                {recommendations.map((entry) => (
                  <li key={entry.book.id} className="py-3">
                    <Link href={`/kitap/${entry.book.slug}`} className="group block">
                      <p className="text-sm font-semibold text-ink group-hover:text-accent">
                        {entry.book.language === 'en' ? '🇬🇧' : '🇹🇷'} {entry.book.title}
                      </p>
                      <p className="text-xs text-muted">
                        {ageLabel(entry.book.ageMin, entry.book.ageMax)}
                      </p>
                      {entry.reasons.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-accent">
                          🏷️ {entry.reasons.join(', ')}
                        </p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
        </section>

        {item && <ReadingNotes libraryItemId={item.id} />}
      </article>
    </div>
  )
}

function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return (
    <span className={cn('rounded-full px-2.5 py-1 text-[11px] font-semibold', className)}>
      {children}
    </span>
  )
}

/** Instagram gömme çerçevesi ayrı bileşende: ağır ve isteğe bağlı. */
export function InstagramEmbed({ url, title }: { url: string; title: string }) {
  const [visible, setVisible] = useState(false)
  useEffect(() => setVisible(true), [])
  if (!visible) return null
  return (
    <iframe
      src={`${url.replace(/\/?$/, '/')}embed/`}
      title={`${title} Instagram gönderisi`}
      loading="lazy"
      className="h-[480px] w-full border-0"
      allowFullScreen
    />
  )
}
