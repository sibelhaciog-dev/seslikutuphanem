'use client'

import { useMemo, useState } from 'react'
import { BookCover } from '@/components/books/BookCover'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import type { CatalogBook } from '@/lib/data/types'
import { ageLabel } from '@/lib/labels'
import { matchesTerms, searchTerms } from '@/lib/search'

const MAX_RESULTS = 60

/** Katalogdan okuma listesine kitap seçme. */
export function CatalogPickerDialog({
  open,
  onClose,
  books,
}: {
  open: boolean
  onClose: () => void
  books: CatalogBook[]
}) {
  const { library, setStatus } = useAppData()
  const toast = useToast()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    const terms = searchTerms(query)
    return books
      .filter((book) => matchesTerms(`${book.title} ${book.summary}`, terms))
      .slice(0, MAX_RESULTS)
  }, [books, query])

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="📚 Kitap seç"
      subtitle="Okumak istediğin kitabı seç"
      headerClassName="bg-linear-[135deg,#409fd8,#2060c0]"
    >
      <div className="relative mb-3">
        <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2">🔍</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Kitap ara…"
          aria-label="Kitap ara"
          className="w-full rounded-full border-[1.5px] border-line py-2.5 pr-4 pl-9 text-sm outline-none focus:border-accent"
        />
      </div>

      <ul className="flex flex-col gap-1">
        {results.map((book) => {
          const added = Boolean(library[book.id])
          return (
            <li key={book.id}>
              <button
                type="button"
                disabled={added}
                onClick={async () => {
                  try {
                    await setStatus(book.id, 'to_read')
                    toast.show('Okuma listesine eklendi.')
                  } catch {
                    toast.show('Eklenemedi.', 'error')
                  }
                }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors',
                  added ? 'cursor-default opacity-50' : 'hover:bg-cream',
                )}
              >
                <span className="h-14 w-10 shrink-0 overflow-hidden rounded-md">
                  <BookCover title={book.title} src={book.coverUrl} compact />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold text-ink">
                    {book.title}
                  </span>
                  <span className="block text-[11px] text-muted">
                    {ageLabel(book.ageMin, book.ageMax)}
                  </span>
                </span>
                <span
                  className={cn(
                    'shrink-0 text-xs font-semibold',
                    added ? 'text-muted' : 'text-[#4090d0]',
                  )}
                >
                  {added ? '✓ Listede' : '+ Ekle'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      {results.length === MAX_RESULTS && (
        <p className="mt-3 text-center text-xs text-muted">
          İlk {MAX_RESULTS} sonuç gösteriliyor — aramayı daraltın.
        </p>
      )}
    </Dialog>
  )
}
