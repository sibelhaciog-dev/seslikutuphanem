'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { StarRating } from '@/components/ui/StarRating'
import { cn } from '@/lib/cn'
import type { CatalogBook } from '@/lib/data/types'
import { groupSessionsByDate, longestStreak } from '@/lib/stats'

const MONTHS = [
  'Ocak',
  'Şubat',
  'Mart',
  'Nisan',
  'Mayıs',
  'Haziran',
  'Temmuz',
  'Ağustos',
  'Eylül',
  'Ekim',
  'Kasım',
  'Aralık',
]
const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz']

function todayIso(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function ReadingCalendar({ books }: { books: CatalogBook[] }) {
  const { activeChild, library, sessions } = useAppData()
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  const itemsById = useMemo(
    () => new Map(Object.values(library).map((item) => [item.id, item])),
    [library],
  )
  const byDate = useMemo(
    () => groupSessionsByDate(sessions, itemsById, books),
    [sessions, itemsById, books],
  )
  const streak = useMemo(() => longestStreak(byDate.keys()), [byDate])
  const totalReadings = sessions.length

  if (!activeChild) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          icon="👶"
          title="Önce bir çocuk profili oluşturun"
          action={<ButtonLink href="/onboarding">Profil oluştur</ButtonLink>}
        />
      </div>
    )
  }

  const firstDay = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const leadingBlanks = (firstDay.getDay() + 6) % 7
  const today = todayIso()

  function shiftMonth(direction: number) {
    const next = new Date(year, month + direction, 1)
    setYear(next.getFullYear())
    setMonth(next.getMonth())
    setSelected(null)
  }

  const selectedBooks = selected ? (byDate.get(selected) ?? []) : []

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl">📅 Okuma takvimi</h1>
      <p className="mb-6 text-sm text-muted">{activeChild.name} hangi gün ne okudu?</p>

      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat value={byDate.size} label="Okuma yapılan gün" />
        <Stat value={totalReadings} label="Toplam okuma" />
        <Stat value={streak} label="En uzun seri" />
      </div>

      <section className="rounded-panel border border-line bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(-1)} aria-label="Önceki ay">
            ‹
          </Button>
          <h2 className="font-serif text-lg">
            {MONTHS[month]} {year}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => shiftMonth(1)} aria-label="Sonraki ay">
            ›
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((day) => (
            <div key={day} className="py-1 text-center text-[11px] font-bold text-muted">
              {day}
            </div>
          ))}

          {Array.from({ length: leadingBlanks }, (_, index) => (
            <div key={`blank-${index}`} />
          ))}

          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1
            const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const dayBooks = byDate.get(date)
            const isToday = date === today

            return (
              <button
                key={date}
                type="button"
                disabled={!dayBooks}
                onClick={() => setSelected(date)}
                aria-label={`${day} ${MONTHS[month]}${dayBooks ? ` — ${dayBooks.length} kitap` : ''}`}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center rounded-lg border-[1.5px] p-0.5 text-[13px] transition-colors',
                  dayBooks
                    ? 'border-accent bg-accent-soft font-bold text-accent hover:bg-accent hover:text-white'
                    : 'border-line text-ink-soft',
                  isToday && !dayBooks && 'border-[#185FA5]',
                  selected === date && 'ring-2 ring-accent',
                )}
              >
                <span>{day}</span>
                {dayBooks && (
                  <span className="text-[8px] leading-tight">{dayBooks.length} kitap</span>
                )}
              </button>
            )
          })}
        </div>
      </section>

      {selected && selectedBooks.length > 0 && (
        <section className="mt-4 rounded-panel border border-line bg-white p-5">
          <h2 className="mb-3 font-serif text-base">
            {new Date(`${selected}T12:00:00`).toLocaleDateString('tr-TR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </h2>
          <ul className="flex flex-col gap-2">
            {selectedBooks.map((book) => (
              <li key={book.id} className="flex items-center justify-between gap-3">
                <Link
                  href={`/kitap/${book.slug}`}
                  className="min-w-0 flex-1 truncate text-sm font-semibold hover:text-accent"
                >
                  {book.title}
                </Link>
                <StarRating value={library[book.id]?.rating ?? 0} size="sm" />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-panel border border-line bg-white p-4 text-center">
      <p className="font-serif text-2xl text-accent">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  )
}
