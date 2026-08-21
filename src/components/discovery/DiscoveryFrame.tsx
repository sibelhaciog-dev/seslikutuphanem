'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button } from '@/components/ui/Button'
import { Chip } from '@/components/ui/Chip'
import { FormMessage } from '@/components/ui/Field'
import type { DiscoveryMode } from '@/lib/data/discovery'
import { DiscoveryResults } from './DiscoveryResults'
import { useDiscovery } from './useDiscovery'

/**
 * Ana sayfadaki keşif çerçevesi.
 *
 * Amaç üç tıkta işe yarar bir öneri (PRD ilke 1): mod seç, istersen bir
 * cümle yaz, "Öner". Uzun form `/kesif` sayfasında.
 *
 * Modlar sunucudan geliyor — kodda sabit liste yok (ADR 0007, 0020).
 */
export function DiscoveryFrame({ modes }: { modes: DiscoveryMode[] }) {
  const { isAuthenticated, activeChild, children } = useAppData()
  const { result, error, busy, run } = useDiscovery()
  const [mode, setMode] = useState<string | null>(null)
  const [prompt, setPrompt] = useState('')

  if (modes.length === 0) return null

  const selected = modes.find((entry) => entry.slug === mode) ?? null

  return (
    <section className="rounded-panel border border-line bg-white p-4">
      <h2 className="text-sm font-bold text-ink">✨ Bugün ne okusak?</h2>
      <p className="mt-1 mb-3 text-xs leading-relaxed text-muted">
        {activeChild
          ? `${activeChild.name} için, şu anki ihtiyacınıza göre öneri alın.`
          : 'Nasıl bir kitap aradığınızı söyleyin, size uygun olanları bulalım.'}
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
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

      {selected?.description && <p className="mb-3 text-xs text-muted">{selected.description}</p>}

      <label className="sr-only" htmlFor="kesif-mesaj">
        Nasıl bir kitap arıyorsunuz?
      </label>
      <input
        id="kesif-mesaj"
        value={prompt}
        maxLength={500}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && isAuthenticated) {
            void run({ childId: activeChild?.id ?? null, mode, prompt })
          }
        }}
        placeholder="Örn: kardeşi olacak, ona hazırlamak istiyorum"
        className="mb-3 w-full rounded-xl border-[1.5px] border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent"
      />

      <FormMessage tone="error">{error}</FormMessage>

      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            disabled={busy}
            className="flex-1"
            onClick={() => void run({ childId: activeChild?.id ?? null, mode, prompt })}
          >
            {busy ? 'Aranıyor…' : 'Öner'}
          </Button>
          <Link
            href="/kesif"
            className="shrink-0 text-xs font-semibold text-accent hover:underline"
          >
            Daha detaylı ara →
          </Link>
        </div>
      ) : (
        <Link href="/giris?devam=/kesif" className="block">
          <Button size="sm" className="w-full">
            Öneri almak için giriş yapın
          </Button>
        </Link>
      )}

      {/* Profil olmadan da çalışıyor; ama daha iyisi mümkün. */}
      {isAuthenticated && children.length === 0 && (
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
          💡 Çocuk profili eklerseniz öneriler yaşına, ilgi alanlarına ve okuduğu kitaplara göre
          kişiselleşir.{' '}
          <Link href="/onboarding" className="font-semibold text-accent">
            Profil ekle
          </Link>
        </p>
      )}

      {result && (
        <div className="mt-4">
          <DiscoveryResults
            picks={result.picks}
            source={result.source}
            note={result.note}
            compact
          />
        </div>
      )}
    </section>
  )
}
