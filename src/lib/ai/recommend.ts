import { z } from 'zod'
import type { CatalogBook } from '@/lib/data/types'
import type { Recommendation } from '@/lib/recommendations'
import { AiError, generateJson } from './client'

/**
 * Keşif önerisi: yapay zekâ SEÇER, ÜRETMEZ (ADR 0007).
 *
 * Modele yalnızca deterministik motorun onayladığı adaylar verilir ve
 * modelden yalnızca bu adayların kimliklerini döndürmesi istenir. Dönen her
 * kimlik havuza karşı doğrulanır; havuzda olmayan sessizce atılır.
 *
 * Bu yüzden model katalogda olmayan bir kitap öneremez ve yaş dışı bir kitap
 * seçemez — havuz zaten yaşa göre süzülmüştür.
 */

export interface DiscoveryContext {
  childName: string | null
  childAge: number | null
  /** Mod adı ("Sakinleşelim") ve modele verilecek ipucu. */
  modeName: string | null
  modeHint: string | null
  /** Ebeveynin serbest metni. */
  prompt: string | null
  /** Çocuğun beğendiği son kitaplar — modele bağlam olarak verilir. */
  lovedTitles: string[]
}

export interface DiscoveryPick {
  book: CatalogBook
  /** Yapay zekânın yazdığı, bu çocuğa özel gerekçe. */
  reason: string
}

/**
 * Modelden istenen çıktı. `bookId` kasıtlı olarak serbest metin: modelin
 * uydurma bir kimlik döndürmesi mümkün, doğrulamayı biz yapıyoruz. Şemayla
 * kısıtlamak yanlış bir güvenlik hissi verirdi.
 */
const selectionSchema = z.object({
  picks: z
    .array(
      z.object({
        bookId: z.string().min(1),
        reason: z.string().min(1).max(240),
      }),
    )
    .min(1)
    .max(8),
})

const SYSTEM = `Sen bir çocuk kitapları rehberisin. Ebeveyne, elindeki ADAY
KİTAPLAR arasından en uygun olanları seçersin.

Kesin kurallar:
- YALNIZCA aday listesindeki kitapları seçebilirsin. Liste dışından kitap
  öneremezsin, kitap adı uyduramazsın.
- Her seçim için "bookId" alanına adayın kimliğini AYNEN yaz.
- "reason": ebeveyne hitap eden, tek cümlelik, somut bir gerekçe. Neden tam
  da bu çocuğa ve bu ana uygun olduğunu söyle.
- Türkçe yaz, samimi ama abartısız. "Muhteşem", "harika" gibi süslemelerden
  kaçın.
- En fazla 4 kitap seç. Az ama isabetli seç; listeyi doldurmak zorunda
  değilsin.
- Çocuğun okuduğu kitapları tekrar önerme (zaten listede yoklar).

Yalnızca JSON döndür.`

/** Modele verilecek aday özeti. Kısa tutuluyor: istem büyüdükçe yavaşlıyor. */
function describeCandidates(candidates: Recommendation[]): string {
  return candidates
    .map((entry) => {
      const book = entry.book
      const age =
        book.ageMin !== null || book.ageMax !== null
          ? ` (${book.ageMin ?? 0}-${book.ageMax ?? 18} yaş)`
          : ''
      const summary = book.summary ? ` — ${book.summary.slice(0, 140)}` : ''
      const topics = book.topicSlugs.length > 0 ? ` [${book.topicSlugs.join(', ')}]` : ''
      return `${book.id} :: ${book.title}${age}${topics}${summary}`
    })
    .join('\n')
}

function describeContext(context: DiscoveryContext): string {
  const lines: string[] = []
  if (context.childName) {
    lines.push(
      `Çocuk: ${context.childName}${context.childAge !== null ? `, ${context.childAge} yaşında` : ''}`,
    )
  } else {
    lines.push('Çocuk profili yok — genel bir öneri yap.')
  }
  if (context.modeName) lines.push(`Mod: ${context.modeName}`)
  if (context.modeHint) lines.push(context.modeHint)
  if (context.prompt) lines.push(`Ebeveynin isteği: "${context.prompt}"`)
  if (context.lovedTitles.length > 0) {
    lines.push(`Sevdiği kitaplar: ${context.lovedTitles.slice(0, 5).join(', ')}`)
  }
  return lines.join('\n')
}

export interface DiscoveryResult {
  picks: DiscoveryPick[]
  model: string
  totalTokens: number
}

/**
 * Adaylar arasından seçtirir ve sonucu havuza karşı doğrular.
 *
 * @throws AiError — yapılandırma yok, zaman aşımı, sağlayıcı hatası ya da
 *         hiçbir geçerli seçim kalmaması durumunda. Çağıran taraf bu durumda
 *         deterministik sıralamaya düşmeli (ADR 0007, adım [4]).
 */
export async function selectRecommendations(
  candidates: Recommendation[],
  context: DiscoveryContext,
): Promise<DiscoveryResult> {
  if (candidates.length === 0) {
    throw new AiError('Aday havuzu boş.', 'invalid_response')
  }

  const result = await generateJson({
    schema: selectionSchema,
    schemaName: 'discovery_selection',
    model: 'text',
    temperature: 0.5,
    maxTokens: 700,
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content: `${describeContext(context)}\n\nADAY KİTAPLAR:\n${describeCandidates(candidates)}`,
      },
    ],
  })

  // ─── Beyaz liste doğrulaması (ADR 0007, adım [3]) ────────────────────────
  // Modelin döndürdüğü her kimlik havuzda olmak zorunda. Uydurulmuş ya da
  // tekrar eden kimlikler sessizce atılır.
  const byId = new Map(candidates.map((entry) => [entry.book.id, entry.book]))
  const seen = new Set<string>()
  const picks: DiscoveryPick[] = []

  for (const pick of result.data.picks) {
    const book = byId.get(pick.bookId.trim())
    if (!book || seen.has(book.id)) continue
    seen.add(book.id)
    picks.push({ book, reason: pick.reason.trim() })
  }

  if (picks.length === 0) {
    throw new AiError('Model havuz dışından seçim yaptı.', 'invalid_response')
  }

  return { picks, model: result.model, totalTokens: result.totalTokens }
}
