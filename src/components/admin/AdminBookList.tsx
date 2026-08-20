'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { AdminBookDialog } from '@/components/admin/AdminBookDialog'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { ageLabel } from '@/lib/labels'

export interface AdminBook {
  id: string
  slug: string
  title: string
  summary: string
  language: 'tr' | 'en'
  age_min: number | null
  age_max: number | null
  status: 'draft' | 'published' | 'archived'
  posted_at: string | null
  like_count: number
}

const STATUS_LABELS: Record<AdminBook['status'], string> = {
  published: 'Yayında',
  draft: 'Taslak',
  archived: 'Arşiv',
}

export function AdminBookList({
  books,
  query,
  status,
  error,
}: {
  books: AdminBook[]
  query: string
  status: string
  error: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(query)
  const [editing, setEditing] = useState<AdminBook | null>(null)

  function navigate(next: { ara?: string; durum?: string }) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    router.push(`/yonetim/kitaplar?${params.toString()}`)
  }

  return (
    <div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          navigate({ ara: search })
        }}
        className="mb-4 flex flex-wrap gap-2"
      >
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Kitap ara…"
          aria-label="Kitap ara"
          className="min-w-48 flex-1 rounded-full border-[1.5px] border-line px-4 py-2 text-sm outline-none focus:border-accent"
        />
        <Button type="submit">Ara</Button>
      </form>

      <div className="mb-5 flex flex-wrap gap-2">
        <Chip active={!status} onClick={() => navigate({ durum: '' })}>
          Tümü
        </Chip>
        {(['published', 'draft', 'archived'] as const).map((value) => (
          <Chip key={value} active={status === value} onClick={() => navigate({ durum: value })}>
            {STATUS_LABELS[value]}
          </Chip>
        ))}
      </div>

      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-danger-soft p-3 text-sm text-danger">
          {error}
        </p>
      )}

      {books.length === 0 ? (
        <EmptyState icon="📚" title="Kitap bulunamadı" description="Aramayı değiştirin." />
      ) : (
        <ul className="divide-y divide-line rounded-panel border border-line bg-white">
          {books.map((book) => (
            <li key={book.id} className="flex flex-wrap items-center gap-3 p-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-[15px] text-ink">{book.title}</p>
                <p className="text-[11px] text-muted">
                  {[
                    book.slug,
                    ageLabel(book.age_min, book.age_max),
                    book.language === 'en' ? 'İngilizce' : 'Türkçe',
                    `❤️ ${book.like_count}`,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              </div>
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 text-[11px] font-bold',
                  book.status === 'published'
                    ? 'bg-success-soft text-success'
                    : book.status === 'draft'
                      ? 'bg-warning-soft text-warning'
                      : 'bg-[#F2F2F7] text-muted',
                )}
              >
                {STATUS_LABELS[book.status]}
              </span>
              <Button size="sm" variant="secondary" onClick={() => setEditing(book)}>
                Düzenle
              </Button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <AdminBookDialog
          book={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
