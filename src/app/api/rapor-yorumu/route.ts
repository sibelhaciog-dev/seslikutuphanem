import { NextResponse } from 'next/server'
import { z } from 'zod'
import { AiError } from '@/lib/ai/client'
import { AI_QUOTAS, aiEnabled } from '@/lib/ai/config'
import { writeReportCommentary } from '@/lib/ai/report'
import { recordUsage, remainingQuota } from '@/lib/ai/usage'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const maxDuration = 45

const requestSchema = z.object({
  childId: z.uuid(),
})

/**
 * Okuma raporuna eşlik eden kişisel yorum.
 *
 * İstemci yalnızca çocuğun kimliğini gönderir; istatistikler sunucuda,
 * kullanıcının kendi yetkisiyle (RLS) okunur. Böylece istemciden gelen
 * uydurma sayılarla metin ürettirilemez.
 */
export async function POST(request: Request) {
  if (!aiEnabled()) {
    return NextResponse.json({ hata: 'Bu özellik şu anda kapalı.' }, { status: 503 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ hata: 'Giriş yapmanız gerekiyor.' }, { status: 401 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ hata: 'Geçersiz istek.' }, { status: 400 })
  }

  const remaining = await remainingQuota(supabase, 'report_note')
  if (remaining <= 0) {
    return NextResponse.json(
      { hata: `Günlük rapor yorumu hakkınız doldu (${AI_QUOTAS.report_note.limit}).` },
      { status: 429 },
    )
  }

  // RLS: başkasının çocuğu sorgulanırsa satır dönmez.
  const { data: child } = await supabase
    .from('children')
    .select('id, name, birth_date')
    .eq('id', parsed.data.childId)
    .maybeSingle()

  if (!child) {
    return NextResponse.json({ hata: 'Çocuk profili bulunamadı.' }, { status: 404 })
  }

  const [{ data: stats }, { data: interests }, { data: items }] = await Promise.all([
    supabase.from('child_reading_stats').select('*').eq('child_id', child.id).maybeSingle(),
    supabase.from('child_interests').select('interests(name)').eq('child_id', child.id),
    supabase
      .from('library_items')
      .select(
        'rating, status, books(title, book_topics(development_topics(name, development_areas(name))))',
      )
      .eq('child_id', child.id)
      .eq('status', 'read')
      .order('rating', { ascending: false })
      .limit(40),
  ])

  const areaCounts = new Map<string, number>()
  const favourites: string[] = []

  for (const item of items ?? []) {
    const book = item.books
    if (!book) continue
    if (item.rating >= 4 && favourites.length < 5) favourites.push(book.title)
    for (const topic of book.book_topics ?? []) {
      const areaName = topic.development_topics?.development_areas?.name
      if (areaName) areaCounts.set(areaName, (areaCounts.get(areaName) ?? 0) + 1)
    }
  }

  const birthYear = child.birth_date ? new Date(child.birth_date).getFullYear() : null

  try {
    const result = await writeReportCommentary({
      childName: child.name,
      childAge: birthYear ? new Date().getFullYear() - birthYear : null,
      booksRead: Number(stats?.books_read ?? 0),
      sessions: Number(stats?.total_sessions ?? 0),
      averageRating: stats?.average_rating ? Number(stats.average_rating) : null,
      longestStreak: 0,
      topAreas: [...areaCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count })),
      favouriteTitles: favourites,
      interests: (interests ?? [])
        .map((row) => row.interests?.name)
        .filter((name): name is string => Boolean(name)),
    })

    await recordUsage(supabase, {
      userId: user.id,
      feature: 'report_note',
      model: result.model,
      totalTokens: result.totalTokens,
      succeeded: true,
    })

    return NextResponse.json({
      baslik: result.data.headline,
      metin: result.data.body,
      oneri: result.data.suggestion,
      kalanHak: remaining - 1,
    })
  } catch (error) {
    await recordUsage(supabase, { userId: user.id, feature: 'report_note', succeeded: false })
    if (error instanceof AiError && error.code === 'invalid_response') {
      return NextResponse.json({ hata: 'Yorum üretilemedi, tekrar deneyin.' }, { status: 502 })
    }
    console.error('rapor-yorumu', error)
    return NextResponse.json({ hata: 'Yorum üretilemedi.' }, { status: 500 })
  }
}
