'use client'

import { useCallback, useState } from 'react'
import type { RecommendationPick } from '@/lib/data/discovery'

/**
 * Keşif isteğini yönetir.
 *
 * Hem ana sayfadaki çerçeve hem `/kesif` sayfası aynı davranışı paylaşsın
 * diye burada: istek sürerken ikinci istek başlatılmaz, hata Türkçe gelir,
 * ve uç deterministik listeye düştüğünde bunu `not` alanıyla söyler.
 */

export interface DiscoveryResponse {
  picks: RecommendationPick[]
  source: 'ai' | 'deterministik'
  note: string | null
  remaining: number | null
}

interface RunInput {
  childId?: string | null
  mode?: string | null
  prompt?: string | null
}

export function useDiscovery() {
  const [result, setResult] = useState<DiscoveryResponse | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const run = useCallback(
    async (input: RunInput): Promise<DiscoveryResponse | null> => {
      if (busy) return null
      setBusy(true)
      setError('')

      try {
        const response = await fetch('/api/oneri', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            childId: input.childId ?? null,
            mode: input.mode ?? null,
            prompt: input.prompt?.trim() ? input.prompt.trim() : null,
          }),
        })

        const body = await response.json().catch(() => null)

        if (!response.ok) {
          setError(body?.hata ?? 'Öneri üretilemedi. Tekrar deneyin.')
          return null
        }

        const next: DiscoveryResponse = {
          picks: body?.oneriler ?? [],
          source: body?.kaynak === 'ai' ? 'ai' : 'deterministik',
          note: body?.not ?? null,
          remaining: typeof body?.kalanHak === 'number' ? body.kalanHak : null,
        }
        setResult(next)
        return next
      } catch {
        setError('Bağlantı kurulamadı. İnternetinizi kontrol edip tekrar deneyin.')
        return null
      } finally {
        setBusy(false)
      }
    },
    [busy],
  )

  const reset = useCallback(() => {
    setResult(null)
    setError('')
  }, [])

  return { result, error, busy, run, reset }
}
