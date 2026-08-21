'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormMessage } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/dates'
import {
  deleteRecommendationRun,
  type DiscoveryMode,
  type RecommendationRun,
} from '@/lib/data/discovery'
import { createClient } from '@/lib/supabase/client'
import { DiscoveryResults } from './DiscoveryResults'
import { useDiscovery } from './useDiscovery'

export function DiscoveryPage({
  modes,
  initialHistory,
}: {
  modes: DiscoveryMode[]
  initialHistory: RecommendationRun[]
}) {
  const { children, activeChild } = useAppData()
  const toast = useToast()
  const { result, error, busy, run } = useDiscovery()

  const [mode, setMode] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')
  const [childId, setChildId] = useState<string | null>(activeChild?.id ?? null)
  const [history, setHistory] = useState(initialHistory)
  const [openRun, setOpenRun] = useState<string | null>(null)

  const selected = modes.find((entry) => entry.slug === mode) ?? null
  const modeName = (slug: string | null) =>
    slug ? (modes.find((entry) => entry.slug === slug)?.name ?? slug) : null

  async function submit() {
    const response = await run({ childId, mode, prompt })
    if (!response) return

    // Geçmişi sunucudan tazelemek yerine başa ekliyoruz: kayıt zaten
    // uçta yazıldı, ek bir gidiş dönüş kullanıcıyı bekletirdi.
    setHistory((current) => [
      {
        id: `yeni-${Date.now()}`,
        childId,
        mode,
        prompt: prompt.trim() || null,
        source: response.source === 'ai' ? 'ai' : 'deterministic',
        picks: response.picks,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ])
  }

  async function remove(id: string) {
    const onaylandi = window.confirm('Bu öneri kaydı silinecek. Emin misiniz?')
    if (!onaylandi) return

    setHistory((current) => current.filter((entry) => entry.id !== id))
    try {
      await deleteRecommendationRun(createClient(), id)
    } catch {
      toast.show('Kayıt silinemedi.', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-7">
      <h1 className="text-2xl">✨ Kitap keşfi</h1>
      <p className="mt-1 mb-6 text-sm leading-relaxed text-muted">
        Nasıl bir kitap aradığınızı anlatın; yaşa uygun kitaplar arasından size en uygun olanları
        seçelim.
      </p>

      <section className="rounded-panel border border-line bg-white p-5">
        {children.length > 1 && (
          <fieldset className="mb-4">
            <legend className="mb-1.5 block text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
              Hangi çocuk için?
            </legend>
            <div className="flex flex-wrap gap-2">
              {children.map((child) => (
                <Chip
                  key={child.id}
                  active={childId === child.id}
                  onClick={() => setChildId(childId === child.id ? null : child.id)}
                >
                  {child.name}
                </Chip>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset className="mb-4">
          <legend className="mb-1.5 block text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
            Nasıl bir an? <span className="font-normal normal-case">(isteğe bağlı)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {modes.map((entry) => (
              <Chip
                key={entry.slug}
                active={mode === entry.slug}
                onClick={() => setMode(mode === entry.slug ? null : entry.slug)}
              >
                {entry.emoji} {entry.name}
              </Chip>
            ))}
          </div>
          {selected?.description && <p className="mt-2 text-xs text-muted">{selected.description}</p>}
        </fieldset>

        <label
          htmlFor="kesif-detay"
          className="mb-1.5 block text-[11px] font-bold tracking-[0.06em] text-muted uppercase"
        >
          Anlatın <span className="font-normal normal-case">(isteğe bağlı)</span>
        </label>
        <textarea
          id="kesif-detay"
          rows={3}
          value={prompt}
          maxLength={500}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Örn: Kardeşi olacak ve biraz kaygılı. Hayvanlı kitapları çok seviyor."
          className="mb-1 w-full resize-y rounded-xl border-[1.5px] border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
        />
        <p className="mb-4 text-right text-[11px] text-muted">{prompt.length}/500</p>

        <FormMessage tone="error">{error}</FormMessage>

        <Button size="lg" disabled={busy} className="w-full" onClick={() => void submit()}>
          {busy ? 'Aranıyor…' : 'Öneri al →'}
        </Button>

        {children.length === 0 && (
          <p className="mt-3 text-xs leading-relaxed text-muted">
            💡 Çocuk profili eklerseniz öneriler yaşına, ilgi alanlarına ve okuduğu kitaplara göre
            kişiselleşir.{' '}
            <Link href="/onboarding" className="font-semibold text-accent">
              Profil ekle
            </Link>
          </p>
        )}

        {result && (
          <div className="mt-5 border-t border-line pt-5">
            <DiscoveryResults picks={result.picks} source={result.source} note={result.note} />
            {result.remaining !== null && (
              <p className="mt-2 text-[11px] text-muted">
                Bugün {result.remaining} öneri hakkınız kaldı.
              </p>
            )}
          </div>
        )}
      </section>

      {/* ─── Geçmiş ───────────────────────────────────────────────────────── */}
      <section className="mt-8">
        <h2 className="mb-3 text-lg">Önceki aramalarınız</h2>

        {history.length === 0 ? (
          <EmptyState
            icon="🔎"
            title="Henüz arama yapmadınız"
            description="Yukarıdan bir mod seçip öneri alın; sonuçlar burada birikir."
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {history.map((entry) => {
              const open = openRun === entry.id
              const label = modeName(entry.mode)
              return (
                <li key={entry.id} className="rounded-panel border border-line bg-white">
                  <div className="flex items-start gap-2 p-4">
                    <button
                      type="button"
                      onClick={() => setOpenRun(open ? null : entry.id)}
                      aria-expanded={open}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm font-semibold text-ink">
                        {entry.prompt || label || 'Genel öneri'}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted">
                        {formatDateTime(entry.createdAt)}
                        {label && entry.prompt ? ` · ${label}` : ''}
                        {` · ${entry.picks.length} kitap`}
                        {entry.source === 'deterministic' ? ' · geçmişe göre' : ''}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(entry.id)}
                      aria-label="Kaydı sil"
                      className="shrink-0 rounded-lg px-2 py-1 text-xs text-muted transition-colors hover:bg-danger-soft hover:text-danger"
                    >
                      Sil
                    </button>
                  </div>

                  <div className={cn('px-4 pb-4', !open && 'hidden')}>
                    <DiscoveryResults
                      picks={entry.picks}
                      source={entry.source === 'ai' ? 'ai' : 'deterministik'}
                      compact
                    />
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
