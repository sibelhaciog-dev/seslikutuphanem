import { z } from 'zod'

/**
 * Yapay zekâ sağlayıcı ayarları (ADR 0003).
 *
 * Tüm çağrılar OpenAI uyumlu bir uç noktaya gider; varsayılan OpenRouter.
 * Sağlayıcıyı veya modeli değiştirmek için yalnızca ortam değişkenleri
 * güncellenir, kod değişmez.
 *
 * Bu modül YALNIZCA sunucuda kullanılır. `AI_API_KEY` istemciye asla gitmez.
 */

const configSchema = z.object({
  baseUrl: z.url(),
  apiKey: z.string().min(8),
  textModel: z.string().min(1),
  visionModel: z.string().min(1),
})

export type AiConfig = z.infer<typeof configSchema>

const DEFAULTS = {
  baseUrl: 'https://openrouter.ai/api/v1',
  textModel: 'anthropic/claude-sonnet-4.5',
  visionModel: 'google/gemini-2.5-flash',
} as const

/**
 * Ayarlar eksikse `null` döner — yapay zekâ özellikleri kapanır, uygulamanın
 * geri kalanı çalışmaya devam eder.
 */
export function readAiConfig(): AiConfig | null {
  const parsed = configSchema.safeParse({
    baseUrl: process.env.AI_BASE_URL || DEFAULTS.baseUrl,
    apiKey: process.env.AI_API_KEY,
    textModel: process.env.AI_TEXT_MODEL || DEFAULTS.textModel,
    visionModel: process.env.AI_VISION_MODEL || DEFAULTS.visionModel,
  })
  return parsed.success ? parsed.data : null
}

export function aiEnabled(): boolean {
  return readAiConfig() !== null
}

/** Kullanıcı başına günlük kotalar. */
export const AI_QUOTAS = {
  cover_scan: { windowHours: 24, limit: 30 },
  report_note: { windowHours: 24, limit: 10 },
} as const

export type AiFeature = keyof typeof AI_QUOTAS
