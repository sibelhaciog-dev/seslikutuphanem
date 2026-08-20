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
 */

export class AiError extends Error {
  constructor(
    message: string,
    readonly code: 'disabled' | 'invalid_response' | 'provider_error',
  ) {
    super(message)
    this.name = 'AiError'
  }
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
    maxRetries: 2,
    timeout: 45_000,
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

  const attempts: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming['response_format'][] =
    [
      { type: 'json_schema', json_schema: { name: schemaName, schema: jsonSchema, strict: true } },
      { type: 'json_object' },
      undefined,
    ]

  let lastError: unknown

  for (const responseFormat of attempts) {
    try {
      const completion = await client.chat.completions.create({
        model: modelName,
        messages,
        max_tokens: maxTokens,
        temperature,
        ...(responseFormat ? { response_format: responseFormat } : {}),
      })

      const raw = completion.choices[0]?.message?.content
      if (!raw) throw new AiError('Model boş yanıt döndürdü.', 'invalid_response')

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
      // Şema desteklenmiyorsa sağlayıcı 400 döner; bir sonraki biçimi dene.
      const status = (error as { status?: number }).status
      const shouldFallback = status === 400 || status === 404 || status === 422
      if (!shouldFallback && !(error instanceof SyntaxError)) {
        if (error instanceof AiError) continue
        break
      }
    }
  }

  if (lastError instanceof AiError) throw lastError
  throw new AiError(
    lastError instanceof Error ? lastError.message : 'Sağlayıcıya ulaşılamadı.',
    'provider_error',
  )
}
