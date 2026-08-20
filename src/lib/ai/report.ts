import { z } from 'zod'
import { generateJson } from './client'

/**
 * Okuma raporuna eşlik eden kişisel yorum.
 *
 * Yapay zekâ hangi kitabın önerileceğine karar vermez — o iş deterministik
 * öneri motorunda (PRD ilke 5). Buradaki tek görev, istatistikleri ebeveyne
 * anlamlı bir paragrafa çevirmek.
 */
export const reportCommentarySchema = z.object({
  headline: z.string().max(80),
  body: z.string().max(600),
  suggestion: z.string().max(200),
})

export type ReportCommentary = z.infer<typeof reportCommentarySchema>

export interface ReportFacts {
  childName: string
  childAge: number | null
  booksRead: number
  sessions: number
  averageRating: number | null
  longestStreak: number
  topAreas: { name: string; count: number }[]
  favouriteTitles: string[]
  interests: string[]
}

export async function writeReportCommentary(facts: ReportFacts) {
  const system = `Sen bir çocuk kitapları rehberisin. Ebeveyne, çocuğunun okuma
alışkanlığı hakkında sıcak, kısa ve somut bir değerlendirme yazarsın.

Kurallar:
- Türkçe yaz, samimi ama abartısız bir dil kullan.
- Yalnızca verilen sayılara dayan; kitap adı veya istatistik uydurma.
- "headline": en fazla 8 kelimelik bir başlık.
- "body": 2-3 cümle. Neyin iyi gittiğini ve hangi gelişim alanının öne çıktığını söyle.
- "suggestion": bir sonraki adım için tek cümlelik somut bir öneri.
- Ebeveyni suçlama, "az okumuşsunuz" gibi ifadeler kullanma.
Yalnızca JSON döndür.`

  return generateJson({
    schema: reportCommentarySchema,
    schemaName: 'report_commentary',
    model: 'text',
    temperature: 0.6,
    maxTokens: 500,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(facts) },
    ],
  })
}
