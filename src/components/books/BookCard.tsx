'use client'

import Link from 'next/link'
import { BookCover } from '@/components/books/BookCover'
import { StarRating } from '@/components/ui/StarRating'
import { cn } from '@/lib/cn'
import type { CatalogBook, LibraryItem } from '@/lib/data/types'
import { ageLabel, LIBRARY_STATUS_EMOJI, LIBRARY_STATUS_LABELS } from '@/lib/labels'

interface BookCardProps {
  book: CatalogBook
  item?: LibraryItem
  interactive: boolean
  onToggleFavorite: () => void
  onRate: (rating: number) => void
  index?: number
}

export function BookCard({
  book,
  item,
  interactive,
  onToggleFavorite,
  onRate,
  index = 0,
}: BookCardProps) {
  const age = ageLabel(book.ageMin, book.ageMax)
  const status = item?.status

  return (
    <article
      className="animate-fade-up relative overflow-hidden rounded-card border border-line bg-white transition-transform duration-200 hover:-translate-y-1 hover:shadow-lift"
      style={{ animationDelay: `${Math.min(index, 20) * 25}ms` }}
    >
      <div className="relative aspect-2/3 overflow-hidden bg-cream">
        <BookCover title={book.title} src={book.coverUrl} />

        <span
          className={cn(
            'absolute top-2 left-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide text-white',
            book.language === 'en' ? 'bg-[#007AFF]/90' : 'bg-accent/90',
          )}
        >
          {book.language === 'en' ? 'EN' : 'TR'}
        </span>

        {interactive && (
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={item?.isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
            aria-pressed={item?.isFavorite ?? false}
            className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/90 text-sm shadow-card backdrop-blur-sm transition-transform hover:scale-110"
          >
            {item?.isFavorite ? '❤️' : '🤍'}
          </button>
        )}

        {status && status !== 'to_read' && (
          <span
            className={cn(
              'absolute bottom-2 left-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-bold',
              status === 'read'
                ? 'bg-success-soft text-success'
                : status === 'reading'
                  ? 'bg-accent-soft text-accent'
                  : 'bg-warning-soft text-warning',
            )}
          >
            {LIBRARY_STATUS_EMOJI[status]} {LIBRARY_STATUS_LABELS[status]}
            {item && item.timesRead > 1 ? ` ×${item.timesRead}` : ''}
          </span>
        )}
      </div>

      <div className="p-3.5">
        {age && (
          <p className="mb-1 text-[10px] font-bold tracking-wider text-muted uppercase">{age}</p>
        )}

        <h3 className="line-clamp-2-serif mb-2 font-serif text-[15px] leading-tight text-ink">
          <Link href={`/kitap/${book.slug}`} className="after:absolute after:inset-0">
            {book.title}
          </Link>
        </h3>

        {interactive && (
          <div className="relative z-10 mb-1.5">
            <StarRating
              value={item?.rating ?? 0}
              size="sm"
              onChange={onRate}
              label="Kitabı puanla"
            />
          </div>
        )}

        <div className="flex items-center justify-between text-[11px]">
          <span className="text-muted">❤️ {book.likeCount}</span>
          <span className="font-semibold text-accent">İncele →</span>
        </div>
      </div>
    </article>
  )
}
