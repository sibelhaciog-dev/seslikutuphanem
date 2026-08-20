'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { BookCover } from '@/components/books/BookCover'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button, ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { StarRating } from '@/components/ui/StarRating'
import { useToast } from '@/components/ui/Toast'
import type { CatalogBook } from '@/lib/data/types'
import { ageLabel } from '@/lib/labels'
import { recommendForChild } from '@/lib/recommendations'
import { longestStreak, reportMessage, summarize } from '@/lib/stats'

interface Commentary {
  baslik: string
  metin: string
  oneri: string
}

export function ReadingReport({ books }: { books: CatalogBook[] }) {
  const { activeChild, activeChildId, library, sessions, taxonomy, aiEnabled } = useAppData()
  const toast = useToast()
  const [commentary, setCommentary] = useState<Commentary | null>(null)
  const [busy, setBusy] = useState(false)

  const summary = useMemo(
    () => summarize(books, library, taxonomy.areas),
    [books, library, taxonomy],
  )
  const streak = useMemo(() => longestStreak(sessions.map((session) => session.readOn)), [sessions])
  const suggestions = useMemo(
    () => recommendForChild(activeChild, books, library, taxonomy, 5),
    [activeChild, books, library, taxonomy],
  )

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

  const message = reportMessage(summary)
  const maxArea = summary.areaBreakdown[0]?.count ?? 1
  const languageTotal = summary.turkishCount + summary.englishCount

  async function generateCommentary() {
    if (!activeChildId) return
    setBusy(true)
    try {
      const response = await fetch('/api/rapor-yorumu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId: activeChildId }),
      })
      const payload = await response.json()
      if (!response.ok) {
        toast.show(payload.hata ?? 'Yorum üretilemedi.', 'error')
        return
      }
      setCommentary(payload as Commentary)
    } catch {
      toast.show('Yorum üretilemedi.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-1 text-3xl">📊 {activeChild.name} okuma raporu</h1>
      <p className="mb-7 text-sm text-muted">
        {new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })} itibarıyla
      </p>

      {summary.booksRead === 0 ? (
        <EmptyState
          icon="📖"
          title="Henüz kitap okunmadı"
          description="Kitapları okundu işaretleyerek başlayın, rapor kendiliğinden dolacak."
          action={<ButtonLink href="/">Kitaplara git</ButtonLink>}
        />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat emoji="📚" value={summary.booksRead} label="Kitap okundu" />
            <Stat emoji="🔁" value={summary.totalSessions} label="Toplam okuma" />
            <Stat
              emoji="⭐"
              value={summary.averageRating ? summary.averageRating.toFixed(1) : '—'}
              label="Ortalama yıldız"
            />
            <Stat emoji="🔥" value={streak} label="En uzun seri" />
          </div>

          {aiEnabled && (
            <section className="rounded-panel border border-line bg-white p-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-bold text-ink">✨ Kişisel değerlendirme</h2>
                <Button size="sm" onClick={() => void generateCommentary()} disabled={busy}>
                  {busy ? 'Yazılıyor…' : commentary ? 'Yeniden yaz' : 'Değerlendirme al'}
                </Button>
              </div>
              {commentary ? (
                <div>
                  <p className="font-serif text-lg text-ink">{commentary.baslik}</p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-soft">{commentary.metin}</p>
                  <p className="mt-3 rounded-xl bg-accent-soft p-3 text-sm text-accent">
                    💡 {commentary.oneri}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  Rakamları sizin için yorumlayalım — okuma alışkanlığında neyin iyi gittiğini ve
                  sırada ne olabileceğini yazalım.
                </p>
              )}
            </section>
          )}

          {summary.areaBreakdown.length > 0 && (
            <section className="rounded-panel border border-line bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">Gelişim alanları</h2>
              {summary.areaBreakdown.map((area) => (
                <div key={area.slug} className="mb-2.5 last:mb-0">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-ink-soft">
                      {area.emoji} {area.name}
                    </span>
                    <span className="font-bold" style={{ color: area.color }}>
                      {area.count} kitap
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-cream">
                    <div
                      className="h-full rounded-full transition-[width] duration-700"
                      style={{
                        width: `${Math.round((area.count / maxArea) * 100)}%`,
                        backgroundColor: area.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </section>
          )}

          {languageTotal > 0 && (
            <section className="rounded-panel border border-line bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">Dil dağılımı</h2>
              <div className="flex h-3 overflow-hidden rounded-full bg-cream">
                <div
                  className="bg-accent"
                  style={{ width: `${(summary.turkishCount / languageTotal) * 100}%` }}
                />
                <div
                  className="bg-[#378ADD]"
                  style={{ width: `${(summary.englishCount / languageTotal) * 100}%` }}
                />
              </div>
              <div className="mt-2.5 flex gap-4 text-xs text-ink-soft">
                <span>🇹🇷 Türkçe — {summary.turkishCount} kitap</span>
                <span>🇬🇧 İngilizce — {summary.englishCount} kitap</span>
              </div>
            </section>
          )}

          {summary.lovedBooks.length > 0 && (
            <section className="rounded-panel border border-line bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">⭐ En çok beğenilenler</h2>
              <ul className="divide-y divide-line">
                {summary.lovedBooks.slice(0, 5).map((book) => (
                  <li key={book.id} className="flex items-center gap-3 py-2">
                    <span className="h-11 w-8 shrink-0 overflow-hidden rounded-md">
                      <BookCover title={book.title} src={book.coverUrl} compact />
                    </span>
                    <Link
                      href={`/kitap/${book.slug}`}
                      className="min-w-0 flex-1 truncate text-xs font-semibold text-ink hover:text-accent"
                    >
                      {book.title}
                    </Link>
                    <StarRating value={library[book.id]?.rating ?? 0} size="sm" />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {message && (
            <p className="rounded-panel border border-[#F5D48A] bg-[#FFF8E6] p-4 text-xs leading-relaxed text-[#BA7517]">
              {message}
            </p>
          )}

          {suggestions.length > 0 && (
            <section className="rounded-panel border border-line bg-white p-5">
              <h2 className="mb-3 text-sm font-bold text-ink">✨ Sırada ne okunabilir?</h2>
              <ul className="divide-y divide-line">
                {suggestions.map((entry) => (
                  <li key={entry.book.id} className="py-2.5">
                    <Link href={`/kitap/${entry.book.slug}`} className="group block">
                      <p className="text-sm font-semibold text-ink group-hover:text-accent">
                        {entry.book.language === 'en' ? '🇬🇧' : '🇹🇷'} {entry.book.title}
                      </p>
                      <p className="text-[11px] text-muted">
                        {ageLabel(entry.book.ageMin, entry.book.ageMax)}
                      </p>
                      {entry.reasons.length > 0 && (
                        <p className="text-[11px] text-accent">🏷️ {entry.reasons.join(', ')}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  )
}

function Stat({ emoji, value, label }: { emoji: string; value: string | number; label: string }) {
  return (
    <div className="rounded-panel border border-line bg-white p-4 text-center">
      <p className="text-xl" aria-hidden>
        {emoji}
      </p>
      <p className="font-serif text-2xl text-ink">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted">{label}</p>
    </div>
  )
}
