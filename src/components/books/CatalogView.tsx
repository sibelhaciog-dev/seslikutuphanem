'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AvatarFigure } from '@/components/avatar/AvatarFigure'
import { DiscoveryFrame } from '@/components/discovery/DiscoveryFrame'
import { BookCard } from '@/components/books/BookCard'
import { GuidePanel } from '@/components/books/GuidePanel'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { AGE_BANDS, ageOf } from '@/lib/age'
import type { DiscoveryMode } from '@/lib/data/discovery'
import type { CatalogBook } from '@/lib/data/types'
import { DEFAULT_FILTERS, filterBooks, hasActiveFilters, type CatalogFilters } from '@/lib/filters'

export function CatalogView({ books, modes }: { books: CatalogBook[]; modes: DiscoveryMode[] }) {
  const { activeChild, library, taxonomy, toggleFavorite, setRating } = useAppData()
  const toast = useToast()
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS)

  const childAge = activeChild ? ageOf(activeChild) : null
  const visible = useMemo(
    () => filterBooks(books, { ...filters, childAge }, library),
    [books, filters, childAge, library],
  )

  function patch(next: Partial<CatalogFilters>) {
    setFilters((current) => ({ ...current, ...next }))
  }

  async function safely(action: () => Promise<void>) {
    try {
      await action()
    } catch {
      toast.show('Kaydedilemedi, bağlantını kontrol et.', 'error')
    }
  }

  const activeTopic = taxonomy.areas
    .flatMap((area) => area.topics)
    .find((topic) => topic.slug === filters.topicSlug)

  const heading = activeTopic
    ? (activeTopic.label ?? activeTopic.name)
    : activeChild
      ? `${activeChild.name} için kitaplar`
      : 'Kitapları keşfet'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-7 lg:flex-row lg:items-start">
      <GuidePanel value={filters.topicSlug} onChange={(topicSlug) => patch({ topicSlug })} />

      <div className="min-w-0 flex-1">
        <div className="mb-6">
          <DiscoveryFrame modes={modes} />
        </div>

        <section className="mb-6 rounded-panel border border-line bg-white p-5">
          <div className="flex flex-wrap items-center gap-4">
            {activeChild && (
              <Link
                href="/profil"
                className="shrink-0 rounded-full border-2 border-accent-soft bg-accent-soft p-1"
                title="Avatarı düzenle"
              >
                <AvatarFigure characterId={activeChild.avatarCharacter} headOnly size={56} />
              </Link>
            )}
            <div className="min-w-40 flex-1">
              <h1 className="text-2xl">{heading}</h1>
              <p className="mt-1 text-sm text-muted">
                {activeTopic
                  ? 'Gelişim konusuna göre filtreleniyor'
                  : activeChild
                    ? `${childAge ?? '?'} yaşına uygun kitaplar gösteriliyor`
                    : 'Tüm kitaplar gösteriliyor'}
              </p>
            </div>
          </div>

          <div className="relative mt-4">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted">
              🔍
            </span>
            <input
              type="search"
              value={filters.query}
              onChange={(event) => patch({ query: event.target.value })}
              placeholder="Kitap adı, konu veya yazar ara…"
              aria-label="Kitaplarda ara"
              className="w-full rounded-full border-[1.5px] border-line bg-cream py-2.5 pr-4 pl-10 text-sm outline-none transition-colors focus:border-accent"
            />
          </div>

          <div className="scrollbar-none mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <span className="shrink-0 text-[11px] font-bold tracking-wider text-muted uppercase">
              Yaş
            </span>
            {AGE_BANDS.map((band) => (
              <Chip
                key={band.slug}
                active={filters.ageBand === band.slug}
                onClick={() => patch({ ageBand: filters.ageBand === band.slug ? null : band.slug })}
              >
                {band.label}
              </Chip>
            ))}

            <span className="mx-1 h-4 w-px shrink-0 bg-line" aria-hidden />

            <span className="shrink-0 text-[11px] font-bold tracking-wider text-muted uppercase">
              Dil
            </span>
            <Chip
              active={filters.language === 'tr'}
              onClick={() => patch({ language: filters.language === 'tr' ? 'all' : 'tr' })}
            >
              🇹🇷 Türkçe
            </Chip>
            <Chip
              active={filters.language === 'en'}
              onClick={() => patch({ language: filters.language === 'en' ? 'all' : 'en' })}
            >
              🇬🇧 İngilizce
            </Chip>

            <span className="mx-1 h-4 w-px shrink-0 bg-line" aria-hidden />

            <span className="shrink-0 text-[11px] font-bold tracking-wider text-muted uppercase">
              Sırala
            </span>
            <Chip active={filters.sort === 'newest'} onClick={() => patch({ sort: 'newest' })}>
              Yeniler
            </Chip>
            <Chip active={filters.sort === 'popular'} onClick={() => patch({ sort: 'popular' })}>
              En beğenilenler
            </Chip>
            <Chip
              active={filters.sort === 'alphabetical'}
              onClick={() => patch({ sort: 'alphabetical' })}
            >
              A–Z
            </Chip>

            {activeChild && (
              <>
                <span className="mx-1 h-4 w-px shrink-0 bg-line" aria-hidden />
                <Chip
                  active={filters.collection === 'favorites'}
                  onClick={() =>
                    patch({ collection: filters.collection === 'favorites' ? 'all' : 'favorites' })
                  }
                >
                  ❤️ Favoriler
                </Chip>
                <Chip
                  active={filters.collection === 'read'}
                  onClick={() =>
                    patch({ collection: filters.collection === 'read' ? 'all' : 'read' })
                  }
                >
                  ✓ Okunanlar
                </Chip>
                <Chip
                  active={filters.collection === 'to_read'}
                  onClick={() =>
                    patch({ collection: filters.collection === 'to_read' ? 'all' : 'to_read' })
                  }
                >
                  🔖 Okuma listesi
                </Chip>
              </>
            )}
          </div>
        </section>

        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-sm text-muted">
            <strong className="text-ink">{visible.length}</strong> kitap
          </p>
          {hasActiveFilters(filters) && (
            <button
              type="button"
              onClick={() => setFilters(DEFAULT_FILTERS)}
              className="text-xs font-semibold text-accent"
            >
              ✕ Filtreleri temizle
            </button>
          )}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            icon="🔍"
            title="Sonuç bulunamadı"
            description="Aramayı veya filtreleri değiştirerek tekrar deneyin."
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 lg:gap-4">
            {visible.map((book, index) => (
              <BookCard
                key={book.id}
                book={book}
                index={index}
                item={library[book.id]}
                interactive={Boolean(activeChild)}
                onToggleFavorite={() => void safely(() => toggleFavorite(book.id))}
                onRate={(rating) => void safely(() => setRating(book.id, rating))}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
