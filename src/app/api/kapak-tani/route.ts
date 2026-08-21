import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AI_QUOTAS } from '@/lib/ai/config'
import { AiError } from '@/lib/ai/client'
import { recognizeBookCover } from '@/lib/ai/cover'
import { recordUsage, remainingQuota } from '@/lib/ai/usage'
import { aiEnabled } from '@/lib/ai/config'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const MAX_IMAGE_BYTES = 4 * 1024 * 1024

const requestSchema = z.object({
  /** `data:` öneki olmadan, saf base64 içerik. */
  image: z
    .string()
    .min(100)
    .max(Math.ceil((MAX_IMAGE_BYTES * 4) / 3)),
  mediaType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
})

/**
 * Kitap kapağı tanıma.
 *
 * Sağlayıcı anahtarı yalnızca sunucuda durur; istek kimlik doğrulama ve
 * kullanıcı başına günlük kota arkasındadır.
 */
export async function POST(request: Request) {
  if (!aiEnabled()) {
    return NextResponse.json({ hata: 'Kapak tanıma şu anda kapalı.' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ hata: 'Bu özellik için giriş yapmanız gerekiyor.' }, { status: 401 })
  }

  const remaining = await remainingQuota(supabase, 'cover_scan')
  if (remaining <= 0) {
    return NextResponse.json(
      {
        hata: `Günlük kapak tarama hakkınız doldu (${AI_QUOTAS.cover_scan.limit}). Yarın tekrar deneyin.`,
      },
      { status: 429 },
    )
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ hata: 'Geçersiz fotoğraf.' }, { status: 400 })
  }

  try {
    const result = await recognizeBookCover(parsed.data.image, parsed.data.mediaType)

    await recordUsage(supabase, {
      userId: user.id,
      feature: 'cover_scan',
      model: result.model,
      totalTokens: result.totalTokens,
      succeeded: true,
    })

    if (!result.data.isBookCover) {
      return NextResponse.json(
        { hata: 'Bu bir kitap kapağı gibi görünmüyor. Tekrar deneyin.' },
        { status: 422 },
      )
    }

    if (!result.data.title.trim()) {
      return NextResponse.json(
        { hata: 'Kapaktaki yazı okunamadı. Daha net bir fotoğraf deneyin.' },
        { status: 422 },
      )
    }

    return NextResponse.json({
      kitapAdi: result.data.title.trim(),
      yazar: result.data.author.trim(),
      ozet: result.data.summary.trim(),
      guven: result.data.confidence,
      kalanHak: remaining - 1,
    })
  } catch (error) {
    await recordUsage(supabase, { userId: user.id, feature: 'cover_scan', succeeded: false })

    if (error instanceof AiError && error.code === 'timeout') {
      return NextResponse.json(
        { hata: 'Yapay zekâ şu anda yavaş yanıt veriyor. Biraz sonra tekrar deneyin.' },
        { status: 504 },
      )
    }
    if (error instanceof AiError && error.code === 'invalid_response') {
      return NextResponse.json(
        { hata: 'Kitap bilgisi okunamadı, tekrar deneyin.' },
        { status: 502 },
      )
    }
    console.error('kapak-tani', error)
    return NextResponse.json({ hata: 'Kapak tanınamadı, tekrar deneyin.' }, { status: 500 })
  }
}
