import OpenAI from 'openai'
import { z } from 'zod'
import { siteUrl } from '@/lib/env'
import { readAiConfig, type AiConfig } from './config'

/**
 * Tüm yapay zekâ çağrılarının geçtiği tek nokta.
 *
 * Sağlayıcılar `response_format` desteğinde farklılaşıyor; bu yüzden üç
 * kademeli bir strateji uygulanıyor:
 *   1. json_schema (en katı, destekleyen modellerde şemaya birebir uyar)
 *   2. json_object (yaygın destek)
 *   3. düz metin + istemdeki talimat
 * Her durumda yanıt Zod ile doğrulanır; model ne döndürürse döndürsün
 * uygulamaya yalnızca şemaya uyan veri girer.
 *
 * ─── ZAMAN BÜTÇESİ ───────────────────────────────────────────────────────
 * Kademeler SIRAYLA deneniyor, yani bir istek birden çok sağlayıcı çağrısı
 * demek. Eskiden her çağrıya ayrı ayrı 45 sn zaman aşımı veriliyor,
 * üstüne SDK'nın kendi `maxRetries: 2` ayarı biniyordu: en kötü ihtimalle
 * 3 kademe × 3 deneme = 9 çağrı. Rotanın `maxDuration` değeri de 45 sn
 * olduğu için fonksiyon, istemci zaman aşımından ÖNCE ölüyordu — kullanıcı
 * düzgün bir hata yerine 504 alıyordu.
 *
 * Artık istek başına tek bir bütçe var (`config.budgetMs`, varsayılan 35 sn).
 * Her kademe bütçeden kalan kadar süre alır; bütçe biterse temiz bir
 * `AiError` döner. Rotalardaki `maxDuration` 60 sn, yani her zaman biz
 * cevap veririz, altyapı değil.
 *
 * SDK yeniden denemesi kapalı: sıkı bir bütçe içinde yeniden deneme,
 * bir sonraki kademeye ayrılan süreyi yiyor. Dayanıklılığı kademeler sağlıyor.
 */

export class AiError extends Error {
  constructor(
    message: string,
    readonly code:
      | 'disabled'
      | 'invalid_response'
      | 'provider_error'
      | 'timeout'
      | 'rate_limited'
      | 'unauthorized',
  ) {
    super(message)
    this.name = 'AiError'
  }
}

/** Bir kademe için ayrılacak en az süre; altına düşersek denemeye değmez. */
const MIN_ATTEMPT_MS = 4_000

/**
 * Model başına, sağlayıcının reddettiği `response_format` biçimleri.
 *
 * Süreç ömrü boyunca hatırlanır: model json_schema desteklemiyorsa her
 * istekte aynı 400'ü almanın ve boşuna süre harcamanın anlamı yok.
 * Sunucu yeniden başlayınca sıfırlanır — model desteği sonradan
 * eklenirse kendiliğinden yeniden denenir.
 */
const rejectedFormats = new Map<string, Set<string>>()

function markRejected(model: string, label: string): void {
  const set = rejectedFormats.get(model) ?? new Set<string>()
  set.add(label)
  rejectedFormats.set(model, set)
}

function isRejected(model: string, label: string): boolean {
  return rejectedFormats.get(model)?.has(label) ?? false
}

function createClient(config: AiConfig): OpenAI {
  return new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseUrl,
    // OpenRouter bu başlıkları kullanım panelinde göstermek için kullanır.
    defaultHeaders: {
      'HTTP-Referer': siteUrl(),
      'X-Title': 'Sesli Kütüphanem',
    },
    // Bütçe yönetimini biz yapıyoruz (yukarıdaki nota bakın).
    maxRetries: 0,
  })
}

/** Model yanıtındaki markdown çitlerini ve ön/arka gürültüyü temizler. */
function extractJson(raw: string): string {
  const withoutFences = raw.replace(/```(?:json)?/gi, '').trim()
  const start = withoutFences.search(/[[{]/)
  if (start === -1) return withoutFences
  const opening = withoutFences[start]
  const closing = opening === '{' ? '}' : ']'
  const end = withoutFences.lastIndexOf(closing)
  return end > start ? withoutFences.slice(start, end + 1) : withoutFences.slice(start)
}

type Message = OpenAI.Chat.Completions.ChatCompletionMessageParam
type ResponseFormat =
  OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming['response_format']

interface GenerateJsonOptions<T extends z.ZodType> {
  messages: Message[]
  schema: T
  schemaName: string
  model: 'text' | 'vision'
  maxTokens?: number
  temperature?: number
}

export interface JsonResult<T> {
  data: T
  model: string
  totalTokens: number
}

/** Yapılandırmaya göre denenecek kademeleri sıralar. */
function planAttempts(
  config: AiConfig,
  schemaName: string,
  jsonSchema: unknown,
): Array<{ label: string; format: ResponseFormat }> {
  const jsonSchemaAttempt = {
    label: 'json_schema',
    format: {
      type: 'json_schema' as const,
      json_schema: { name: schemaName, schema: jsonSchema as Record<string, unknown>, strict: true },
    },
  }
  const jsonObjectAttempt = { label: 'json_object', format: { type: 'json_object' as const } }
  const plainAttempt = { label: 'plain', format: undefined }

  switch (config.structuredOutput) {
    case 'json_schema':
      return [jsonSchemaAttempt, plainAttempt]
    case 'json_object':
      return [jsonObjectAttempt, plainAttempt]
    case 'none':
      return [plainAttempt]
    default:
      return [jsonSchemaAttempt, jsonObjectAttempt, plainAttempt]
  }
}

/** Sağlayıcı bu biçimi hiç desteklemiyor mu, yoksa geçici bir sorun mu? */
function isFormatRejection(error: unknown): boolean {
  const status = (error as { status?: number }).status
  return status === 400 || status === 404 || status === 422
}

/**
 * Sağlayıcı tarafındaki kalıcı durumlar. Kademe değiştirmek bunları çözmez,
 * bu yüzden hemen ve ayırt edilebilir bir hatayla çıkıyoruz.
 *
 * 429: sağlayıcı hız sınırı (bizim kullanıcı kotamızdan farklı).
 * 401/402/403: anahtar geçersiz ya da kredi yok — yapılandırma sorunu.
 */
function providerStatusError(error: unknown): AiError | null {
  const status = (error as { status?: number }).status
  if (status === 429) {
    return new AiError('Sağlayıcı hız sınırına takıldı (429).', 'rate_limited')
  }
  if (status === 401 || status === 402 || status === 403) {
    return new AiError(
      `Sağlayıcı isteği reddetti (${status}): anahtar geçersiz ya da kredi yetersiz.`,
      'unauthorized',
    )
  }
  return null
}

function isTimeout(error: unknown): boolean {
  if (error instanceof OpenAI.APIUserAbortError) return true
  const name = (error as { name?: string }).name
  return name === 'AbortError' || name === 'APIConnectionTimeoutError'
}

export async function generateJson<T extends z.ZodType>({
  messages,
  schema,
  schemaName,
  model,
  maxTokens = 700,
  temperature = 0.3,
}: GenerateJsonOptions<T>): Promise<JsonResult<z.infer<T>>> {
  const config = readAiConfig()
  if (!config) throw new AiError('Yapay zekâ yapılandırılmamış.', 'disabled')

  const client = createClient(config)
  const modelName = model === 'vision' ? config.visionModel : config.textModel
  const jsonSchema = z.toJSONSchema(schema, { target: 'draft-7' })

  const deadline = Date.now() + config.budgetMs
  const attempts = planAttempts(config, schemaName, jsonSchema).filter(
    (attempt) => !isRejected(modelName, attempt.label),
  )

  let lastError: unknown
  let attempted = 0

  for (const attempt of attempts) {
    const remaining = deadline - Date.now()
    if (remaining < MIN_ATTEMPT_MS) break

    attempted += 1
    try {
      const completion = await client.chat.completions.create(
        {
          model: modelName,
          messages,
          max_tokens: maxTokens,
          temperature,
          ...(attempt.format ? { response_format: attempt.format } : {}),
        },
        { timeout: remaining },
      )

      const choice = completion.choices[0]
      const raw = choice?.message?.content

      if (!raw) {
        // Akıl yürüten ("reasoning") modellerde sık görülür: düşünme
        // jetonları `max_tokens` bütçesini bitirir ve `content` boş gelir.
        // Bunu ayırt etmek önemli, yoksa "model bozuk" sanılıyor.
        const reason = choice?.finish_reason
        throw new AiError(
          reason === 'length'
            ? `Model yanıtı jeton sınırına takıldı (max_tokens: ${maxTokens}).`
            : 'Model boş yanıt döndürdü.',
          'invalid_response',
        )
      }

      const parsed = schema.safeParse(JSON.parse(extractJson(raw)))
      if (!parsed.success) {
        throw new AiError('Model yanıtı beklenen biçimde değil.', 'invalid_response')
      }

      return {
        data: parsed.data,
        model: modelName,
        totalTokens: completion.usage?.total_tokens ?? 0,
      }
    } catch (error) {
      lastError = error

      if (isTimeout(error)) {
        throw new AiError('Model zamanında yanıt vermedi.', 'timeout')
      }

      const statusError = providerStatusError(error)
      if (statusError) throw statusError

      if (isFormatRejection(error)) {
        // Bu model bu biçimi desteklemiyor; bir daha denemeyelim.
        markRejected(modelName, attempt.label)
        continue
      }

      // Boş/bozuk yanıt ya da şemaya uymayan çıktı: sonraki kademeyi dene.
      if (error instanceof AiError || error instanceof SyntaxError) continue

      // Kimlik doğrulama, kota, 5xx… kademe değiştirmek bunu çözmez.
      break
    }
  }

  if (Date.now() >= deadline && attempted > 0) {
    throw new AiError('Model zamanında yanıt vermedi.', 'timeout')
  }
  if (lastError instanceof AiError) throw lastError
  throw new AiError(
    lastError instanceof Error ? lastError.message : 'Sağlayıcıya ulaşılamadı.',
    'provider_error',
  )
}
