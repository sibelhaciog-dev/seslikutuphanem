'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BookCover } from '@/components/books/BookCover'
import { AchievementGrid } from '@/components/library/AchievementGrid'
import { CatalogPickerDialog } from '@/components/library/CatalogPickerDialog'
import { CoverScanDialog } from '@/components/library/CoverScanDialog'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { StarRating } from '@/components/ui/StarRating'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import type { CatalogBook } from '@/lib/data/types'
import { ageLabel, LIBRARY_STATUS_LABELS } from '@/lib/labels'
import { summarize } from '@/lib/stats'

type Tab = 'read' | 'to_read' | 'achievements'

const TABS: { value: Tab; label: string }[] = [
  { value: 'read', label: '📖 Okuduklarım' },
  { value: 'to_read', label: '🔖 Okuma listem' },
  { value: 'achievements', label: '🏅 Başarımlar' },
]

export function LibraryView({ books }: { books: CatalogBook[] }) {
  const {
    activeChild,
    library,
    customBooks,
    customItems,
    taxonomy,
    points,
    removeItem,
    loading,
    aiEnabled,
  } = useAppData()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('read')
  const [scanOpen, setScanOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  const summary = useMemo(
    () => summarize(books, library, taxonomy.areas),
    [books, library, taxonomy],
  )
  const booksById = useMemo(() => new Map(books.map((book) => [book.id, book])), [books])
  const customById = useMemo(
    () => new Map(customBooks.map((book) => [book.id, book])),
    [customBooks],
  )

  const readBooks = useMemo(
    () =>
      Object.values(library)
        .filter((item) => item.status === 'read')
        .sort((a, b) => (b.lastReadAt ?? '').localeCompare(a.lastReadAt ?? ''))
        .map((item) => ({ item, book: booksById.get(item.bookId!) }))
        .filter((entry): entry is { item: typeof entry.item; book: CatalogBook } =>
          Boolean(entry.book),
        ),
    [library, booksById],
  )

  const toReadCatalog = useMemo(
    () =>
      Object.values(library)
        .filter((item) => item.status === 'to_read')
        .map((item) => ({ item, book: booksById.get(item.bookId!) }))
        .filter((entry): entry is { item: typeof entry.item; book: CatalogBook } =>
          Boolean(entry.book),
        ),
    [library, booksById],
  )

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-muted">Yükleniyor…</div>
  }

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon="👶"
          title="Önce bir çocuk profili oluşturun"
          description="Okuma kayıtları çocuk profiline bağlı tutulur."
          action={<ButtonLink href="/onboarding">Profil oluştur</ButtonLink>}
        />
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-3xl">📚 {activeChild.name} kitaplığı</h1>
      <p className="mb-6 text-sm text-muted">⭐ {points} yıldız puanı</p>

      <div className="mb-6 flex gap-2 rounded-2xl bg-cream p-1">
        {TABS.map((entry) => (
          <button
            key={entry.value}
            type="button"
            onClick={() => setTab(entry.value)}
            aria-pressed={tab === entry.value}
            className={cn(
              'flex-1 rounded-xl py-2.5 text-[13px] font-bold transition-colors',
              tab === entry.value ? 'bg-accent text-white' : 'text-muted hover:text-accent',
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      {tab === 'read' && (
        <>
          <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat value={summary.booksRead} label="Okunan kitap" />
            <Stat value={summary.totalSessions} label="Toplam okuma" />
            <Stat
              value={summary.averageRating ? summary.averageRating.toFixed(1) : '—'}
              label="Ortalama puan"
            />
            <Stat value={summary.favorites} label="Favori" />
          </div>

          {readBooks.length === 0 ? (
            <EmptyState
              icon="📖"
              title="Henüz okunmuş kitap yok"
              description="Kitap sayfasında “Bugün okuduk” diyerek başlayın."
              action={<ButtonLink href="/">Kitaplara git</ButtonLink>}
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {readBooks.map(({ item, book }) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3.5 rounded-panel border border-line bg-white p-3.5"
                >
                  <div className="h-18 w-12 shrink-0 overflow-hidden rounded-lg">
                    <BookCover title={book.title} src={book.coverUrl} compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/kitap/${book.slug}`}
                      className="block truncate font-serif text-[15px] text-ink hover:text-accent"
                    >
                      {book.title}
                    </Link>
                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <StarRating value={item.rating} size="sm" />
                      {item.timesRead > 1 && (
                        <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent">
                          {item.timesRead} kez okundu
                        </span>
                      )}
                      <span className="text-[11px] text-muted">
                        {ageLabel(book.ageMin, book.ageMax)}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {tab === 'to_read' && (
        <>
          {/* Kapak tarama yalnızca yapay zekâ sağlayıcısı ayarlıysa gösterilir;
              aksi hâlde çalışmayacak bir buton sunmuş oluruz. */}
          <div className={cn('mb-6 grid gap-3', aiEnabled ? 'grid-cols-2' : 'grid-cols-1')}>
            {aiEnabled && (
              <button
                type="button"
                onClick={() => setScanOpen(true)}
                className="rounded-2xl border-2 border-dashed border-[#c0a0f0] bg-linear-[135deg,rgba(102,126,234,0.06),rgba(118,75,162,0.06)] px-3 py-6 text-center transition-colors hover:border-[#764ba2]"
              >
                <span className="block text-4xl" aria-hidden>
                  📷
                </span>
                <span className="mt-2 block text-[13px] font-bold text-[#764ba2]">Kapak tara</span>
                <span className="mt-1 block text-[11px] text-muted">
                  Fotoğrafla, kitabı tanıyalım
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="rounded-2xl border-2 border-dashed border-[#a0c8f0] bg-linear-[135deg,rgba(64,158,255,0.06),rgba(32,108,200,0.06)] px-3 py-6 text-center transition-colors hover:border-[#4090d0]"
            >
              <span className="block text-4xl" aria-hidden>
                📚
              </span>
              <span className="mt-2 block text-[13px] font-bold text-[#4090d0]">Listeden seç</span>
              <span className="mt-1 block text-[11px] text-muted">
                {books.length} kitap arasından
              </span>
            </button>
          </div>

          {toReadCatalog.length === 0 && customItems.length === 0 ? (
            <EmptyState
              icon="🔖"
              title="Okuma listesi boş"
              description="Yukarıdaki iki yoldan biriyle kitap ekleyin."
            />
          ) : (
            <ul className="flex flex-col gap-3">
              {toReadCatalog.map(({ item, book }) => (
                <li
                  key={item.id}
                  className="flex items-center gap-3.5 rounded-panel border border-line bg-white p-3.5"
                >
                  <div className="h-18 w-12 shrink-0 overflow-hidden rounded-lg">
                    <BookCover title={book.title} src={book.coverUrl} compact />
                  </div>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/kitap/${book.slug}`}
                      className="block truncate font-serif text-[15px] hover:text-accent"
                    >
                      {book.title}
                    </Link>
                    <p className="text-[11px] text-muted">{LIBRARY_STATUS_LABELS[item.status]}</p>
                  </div>
                  <RemoveButton onClick={() => remove(item.id)} label={book.title} />
                </li>
              ))}

              {customItems.map((item) => {
                const custom = customById.get(item.customBookId!)
                if (!custom) return null
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3.5 rounded-panel border border-line bg-white p-3.5"
                  >
                    <div className="h-18 w-12 shrink-0 overflow-hidden rounded-lg">
                      <BookCover title={custom.title} src={custom.coverUrl} compact />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-serif text-[15px]">{custom.title}</p>
                      {custom.authorName && (
                        <p className="text-xs text-muted">✍️ {custom.authorName}</p>
                      )}
                      <p className="text-[11px] text-muted">
                        {custom.origin === 'camera' ? '📷 Kapaktan eklendi' : '✍️ Elle eklendi'}
                      </p>
                    </div>
                    <RemoveButton onClick={() => remove(item.id)} label={custom.title} />
                  </li>
                )
              })}
            </ul>
          )}

          {aiEnabled && <CoverScanDialog open={scanOpen} onClose={() => setScanOpen(false)} />}
          <CatalogPickerDialog
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            books={books}
          />
        </>
      )}

      {tab === 'achievements' && <AchievementGrid />}
    </div>
  )

  async function remove(itemId: string) {
    try {
      await removeItem(itemId)
    } catch {
      toast.show('Silinemedi.', 'error')
    }
  }
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button variant="ghost" size="sm" aria-label={`${label} listeden çıkar`} onClick={onClick}>
      🗑️
    </Button>
  )
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="rounded-panel border border-line bg-white p-4">
      <p className="font-serif text-2xl text-accent">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{label}</p>
    </div>
  )
}
