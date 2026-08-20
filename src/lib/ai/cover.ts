import { z } from 'zod'
import { generateJson } from './client'

/** Kapak fotoğrafından çıkarılan kitap bilgisi. */
export const coverRecognitionSchema = z.object({
  isBookCover: z.boolean(),
  title: z.string(),
  author: z.string(),
  summary: z.string(),
  /** Model kendi güvenini 0–1 arasında bildirir. */
  confidence: z.number().min(0).max(1),
})

export type CoverRecognition = z.infer<typeof coverRecognitionSchema>

const PROMPT = `Bu görselde bir çocuk kitabının kapağı var mı? İncele ve JSON döndür.

Kurallar:
- "isBookCover": görsel bir kitap kapağı değilse false, diğer alanları boş bırak.
- "title": kapakta yazan kitap adı, aynen ve eksiksiz.
- "author": kapakta yazan yazar adı; görünmüyorsa boş bırak.
- "summary": kitabın ne anlattığına dair en fazla bir cümlelik Türkçe özet.
- "confidence": kitap adını ne kadar net okuyabildiğin, 0 ile 1 arasında.
Yalnızca JSON döndür, başka açıklama yazma.`

export async function recognizeBookCover(base64Image: string, mediaType: string) {
  return generateJson({
    schema: coverRecognitionSchema,
    schemaName: 'book_cover',
    model: 'vision',
    temperature: 0,
    maxTokens: 500,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64Image}` } },
        ],
      },
    ],
  })
}
