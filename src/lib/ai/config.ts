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

/**
 * `structuredOutput` hangi `response_format` kademelerinin denenebileceğini
 * söyler. Modelin JSON şema desteği yoksa `auto` her istekte boşa bir tur
 * attırır; bunu biliyorsanız doğrudan `json_object` ya da `none` verin.
 */
const configSchema = z.object({
  baseUrl: z.url(),
  apiKey: z.string().min(8),
  textModel: z.string().min(1),
  visionModel: z.string().min(1),
  structuredOutput: z.enum(['auto', 'json_schema', 'json_object', 'none']),
  /** Bir isteğe ayrılan toplam süre. Fonksiyon sınırından KISA olmalı. */
  budgetMs: z.number().int().min(5_000).max(120_000),
})

export type AiConfig = z.infer<typeof configSchema>

const DEFAULTS = {
  baseUrl: 'https://openrouter.ai/api/v1',
  textModel: 'anthropic/claude-sonnet-4.5',
  visionModel: 'google/gemini-2.5-flash',
  structuredOutput: 'auto',
  /**
   * 35 sn. Rotalardaki `maxDuration` 60 sn — arada bilerek pay var ki
   * süre dolduğunda Vercel fonksiyonu öldürmeden önce biz düzgün bir hata
   * döndürebilelim. Eskiden ikisi de 45 sn'di; fonksiyon her seferinde
   * istemci zaman aşımından ÖNCE ölüyor ve kullanıcı 504 görüyordu.
   */
  budgetMs: 35_000,
} as const

/**
 * Ayarlar eksikse `null` döner — yapay zekâ özellikleri kapanır, uygulamanın
 * geri kalanı çalışmaya devam eder.
 */
export function readAiConfig(): AiConfig | null {
  const budget = Number(process.env.AI_BUDGET_MS)

  const parsed = configSchema.safeParse({
    baseUrl: process.env.AI_BASE_URL || DEFAULTS.baseUrl,
    apiKey: process.env.AI_API_KEY,
    textModel: process.env.AI_TEXT_MODEL || DEFAULTS.textModel,
    visionModel: process.env.AI_VISION_MODEL || DEFAULTS.visionModel,
    structuredOutput: process.env.AI_STRUCTURED_OUTPUT || DEFAULTS.structuredOutput,
    budgetMs: Number.isFinite(budget) && budget > 0 ? budget : DEFAULTS.budgetMs,
  })
  return parsed.success ? parsed.data : null
}

export function aiEnabled(): boolean {
  return readAiConfig() !== null
}

/**
 * Kullanıcı başına günlük kotalar.
 *
 * DİKKAT: Buraya yeni bir kalem eklerken `ai_usage_events.feature` kısıtını
 * da genişletin (bkz. 0021). Aksi halde kullanım kaydı sessizce düşer ve
 * kota fiilen uygulanmaz.
 */
export const AI_QUOTAS = {
  cover_scan: { windowHours: 24, limit: 30 },
  report_note: { windowHours: 24, limit: 10 },
  /** Keşif önerisi (ADR 0007). Tek çağrı, kısa istem — sınır daha rahat. */
  recommendation: { windowHours: 24, limit: 20 },
} as const

export type AiFeature = keyof typeof AI_QUOTAS
