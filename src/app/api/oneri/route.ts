import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AiError } from '@/lib/ai/client'
import { AI_QUOTAS, aiEnabled } from '@/lib/ai/config'
import { selectRecommendations } from '@/lib/ai/recommend'
import { recordUsage, remainingQuota } from '@/lib/ai/usage'
import { ageOf } from '@/lib/age'
import { getCatalog, getTaxonomy } from '@/lib/data/catalog'
import { loadDiscoveryMode, toWeightRecord } from '@/lib/data/discovery'
import { loadChildren, loadLibraryItems } from '@/lib/data/library'
import type { LibraryIndex } from '@/lib/data/types'
import { candidatePool } from '@/lib/recommendations'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

/** Aday havuzu boyutu. Büyütmek istemi büyütür ve yanıtı yavaşlatır. */
const POOL_SIZE = 35
/** Yapay zekâ kapalıyken gösterilecek deterministik öneri sayısı. */
const FALLBACK_SIZE = 4

const requestSchema = z.object({
  childId: z.uuid().nullable().optional(),
  mode: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(40)
    .nullable()
    .optional(),
  prompt: z.string().trim().max(500).nullable().optional(),
})

/**
 * Keşif önerisi (ADR 0007).
 *
 * Aday havuzunu deterministik motor hazırlar, yapay zekâ yalnızca bu adaylar
 * arasından seçer. Servis kapalı ya da hatalıysa deterministik sıralama
 * döner — uç asla boş dönmez.
 */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ hata: 'Bu özellik için giriş yapmanız gerekiyor.' }, { status: 401 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ hata: 'Geçersiz istek.' }, { status: 400 })
  }
  const { childId = null, mode: modeSlug = null, prompt = null } = parsed.data

  // ─── Bağlam ──────────────────────────────────────────────────────────────
  const [catalog, taxonomy, children] = await Promise.all([
    getCatalog(),
    getTaxonomy(),
    loadChildren(supabase),
  ])

  // RLS zaten süzüyor; yine de istenen çocuk gerçekten kullanıcınınki mi diye
  // listeden seçiyoruz — böylece başkasının kimliği sessizce yok sayılıyor.
  const child = childId ? (children.find((entry) => entry.id === childId) ?? null) : null
  if (childId && !child) {
    return NextResponse.json({ hata: 'Çocuk profili bulunamadı.' }, { status: 404 })
  }

  const mode = modeSlug ? await loadDiscoveryMode(supabase, modeSlug) : null
  if (modeSlug && !mode) {
    return NextResponse.json({ hata: 'Seçilen mod bulunamadı.' }, { status: 404 })
  }

  const items = child ? await loadLibraryItems(supabase, child.id) : []
  const library: LibraryIndex = Object.fromEntries(
    items.filter((item) => item.bookId).map((item) => [item.bookId!, item]),
  )

  // ─── [1] Deterministik aday havuzu ───────────────────────────────────────
  const candidates = candidatePool(
    child,
    catalog,
    library,
    taxonomy,
    {
      topicWeights: mode ? toWeightRecord(mode.topics) : undefined,
      interestWeights: mode ? toWeightRecord(mode.interests) : undefined,
      prompt: prompt ?? undefined,
    },
    POOL_SIZE,
  )

  if (candidates.length === 0) {
    return NextResponse.json(
      { hata: 'Uygun kitap bulunamadı. Farklı bir mod deneyin.' },
      { status: 404 },
    )
  }

  /** Yapay zekâsız yol: deterministik sıralamayı olduğu gibi göster. */
  async function respondDeterministic(reason: 'disabled' | 'failed') {
    const picks = candidates.slice(0, FALLBACK_SIZE).map((entry) => ({
      kitapId: entry.book.id,
      slug: entry.book.slug,
      baslik: entry.book.title,
      gerekce: entry.reasons[0] ?? 'Yaşına ve ilgi alanlarına uygun.',
    }))

    await supabase.from('ai_recommendations').insert({
      user_id: user!.id,
      child_id: child?.id ?? null,
      mode: modeSlug,
      prompt,
      results: picks,
      source: 'deterministic',
    })

    return NextResponse.json({
      oneriler: picks,
      kaynak: 'deterministik',
      not:
        reason === 'disabled'
          ? 'Yapay zekâ şu anda kapalı; öneriler okuma geçmişine göre sıralandı.'
          : 'Yapay zekâya ulaşılamadı; öneriler okuma geçmişine göre sıralandı.',
    })
  }

  if (!aiEnabled()) return respondDeterministic('disabled')

  const remaining = await remainingQuota(supabase, 'recommendation')
  if (remaining <= 0) {
    return NextResponse.json(
      { hata: `Günlük öneri hakkınız doldu (${AI_QUOTAS.recommendation.limit}).` },
      { status: 429 },
    )
  }

  // ─── [2] Yapay zekâ seçer ────────────────────────────────────────────────
  try {
    const loved = items
      .filter((item) => item.rating >= 4 && item.bookId)
      .map((item) => catalog.find((book) => book.id === item.bookId)?.title)
      .filter((title): title is string => Boolean(title))

    const result = await selectRecommendations(candidates, {
      childName: child?.name ?? null,
      childAge: child ? ageOf(child) : null,
      modeName: mode?.name ?? null,
      modeHint: mode?.promptHint ?? null,
      prompt,
      lovedTitles: loved,
    })

    const picks = result.picks.map((pick) => ({
      kitapId: pick.book.id,
      slug: pick.book.slug,
      baslik: pick.book.title,
      gerekce: pick.reason,
    }))

    await Promise.all([
      recordUsage(supabase, {
        userId: user.id,
        feature: 'recommendation',
        model: result.model,
        totalTokens: result.totalTokens,
        succeeded: true,
      }),
      supabase.from('ai_recommendations').insert({
        user_id: user.id,
        child_id: child?.id ?? null,
        mode: modeSlug,
        prompt,
        results: picks,
        source: 'ai',
        model: result.model,
        total_tokens: result.totalTokens,
      }),
    ])

    return NextResponse.json({ oneriler: picks, kaynak: 'ai', kalanHak: remaining - 1 })
  } catch (error) {
    await recordUsage(supabase, { userId: user.id, feature: 'recommendation', succeeded: false })

    // Hız sınırı ve yetki sorunları kullanıcıya açıkça söylenir; kalan her
    // durumda sessizce deterministik listeye düşülür (ADR 0007, adım [4]).
    if (error instanceof AiError && error.code === 'rate_limited') {
      return NextResponse.json(
        { hata: 'Yapay zekâ servisi şu anda yoğun. Birkaç dakika sonra tekrar deneyin.' },
        { status: 429 },
      )
    }

    console.error('oneri', error)
    return respondDeterministic('failed')
  }
}
