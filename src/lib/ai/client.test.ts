import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import type OpenAIModule from 'openai'

const createMock = vi.fn()

// OpenAI istemcisini taklit ediyoruz; ağa çıkmadan kademe ve bütçe
// davranışını sınıyoruz. Statikler gerçek sınıftan geliyor çünkü
// `isTimeout` bunlara bakıyor.
vi.mock('openai', async (importOriginal) => {
  const actual = await importOriginal<{ default: typeof OpenAIModule }>()
  class MockOpenAI {
    chat = { completions: { create: createMock } }
    static APIUserAbortError = actual.default.APIUserAbortError
  }
  return { ...actual, default: MockOpenAI }
})

const schema = z.object({ headline: z.string() })

/** Sağlayıcının biçimi reddetmesi (400/404/422). */
function rejection(status: number) {
  return Object.assign(new Error('unsupported response_format'), { status })
}

/** Mock'a giden ilk argümanı (istek gövdesi) okur. */
function requestAt(index: number): {
  model: string
  response_format?: { type: string }
} {
  return createMock.mock.calls[index]![0]
}

function reply(content: string | null, finishReason = 'stop') {
  return {
    choices: [{ message: { content }, finish_reason: finishReason }],
    usage: { total_tokens: 42 },
  }
}

async function callGenerate(model: 'text' | 'vision' = 'text') {
  const { generateJson } = await import('./client')
  return generateJson({
    messages: [{ role: 'user', content: 'merhaba' }],
    schema,
    schemaName: 'test',
    model,
  })
}

describe('generateJson', () => {
  beforeEach(() => {
    vi.resetModules() // reddedilen biçim önbelleği testler arasında sızmasın
    createMock.mockReset()
    process.env.AI_API_KEY = 'test-anahtar-12345'
    process.env.AI_BASE_URL = 'https://ornek.test/v1'
    process.env.AI_TEXT_MODEL = 'saglayici/model'
    process.env.AI_VISION_MODEL = 'saglayici/vision'
    delete process.env.AI_STRUCTURED_OUTPUT
    delete process.env.AI_BUDGET_MS
  })

  afterEach(() => {
    delete process.env.AI_API_KEY
    delete process.env.AI_STRUCTURED_OUTPUT
    delete process.env.AI_BUDGET_MS
  })

  it('ilk kademe çalışırsa tek çağrı yapar', async () => {
    createMock.mockResolvedValueOnce(reply('{"headline":"merhaba"}'))
    const result = await callGenerate()
    expect(result.data.headline).toBe('merhaba')
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  // Asıl hata buydu: kademeler sırayla denenirken toplam süre kimseyi
  // ilgilendirmiyordu; üç çağrı fonksiyon sınırını aşıyordu.
  it('her çağrıya kalan bütçe kadar zaman aşımı verir', async () => {
    createMock.mockResolvedValueOnce(reply('{"headline":"tamam"}'))
    await callGenerate()
    const options = createMock.mock.calls[0]![1] as { timeout: number }
    expect(options.timeout).toBeGreaterThan(0)
    expect(options.timeout).toBeLessThanOrEqual(35_000)
  })

  it('biçim reddedilirse sonraki kademeye geçer', async () => {
    createMock
      .mockRejectedValueOnce(rejection(400)) // json_schema desteklenmiyor
      .mockResolvedValueOnce(reply('{"headline":"ikinci kademe"}'))

    const result = await callGenerate()
    expect(result.data.headline).toBe('ikinci kademe')
    expect(createMock).toHaveBeenCalledTimes(2)
    expect(requestAt(0).response_format?.type).toBe('json_schema')
    expect(requestAt(1).response_format?.type).toBe('json_object')
  })

  // Model json_schema desteklemiyorsa her istekte aynı 400'ü yemenin
  // ve boşuna süre harcamanın anlamı yok.
  it('reddedilen biçimi hatırlar, sonraki isteklerde denemez', async () => {
    createMock
      .mockRejectedValueOnce(rejection(404))
      .mockResolvedValueOnce(reply('{"headline":"bir"}'))
    await callGenerate()
    expect(createMock).toHaveBeenCalledTimes(2)

    createMock.mockReset()
    createMock.mockResolvedValueOnce(reply('{"headline":"iki"}'))
    await callGenerate()

    expect(createMock).toHaveBeenCalledTimes(1)
    expect(requestAt(0).response_format?.type).toBe('json_object')
  })

  it('düz metin yanıtındaki markdown çitlerini ayıklar', async () => {
    createMock.mockResolvedValueOnce(reply('```json\n{"headline":"çitli"}\n```'))
    expect((await callGenerate()).data.headline).toBe('çitli')
  })

  it('şemaya uymayan yanıtta sonraki kademeyi dener', async () => {
    createMock
      .mockResolvedValueOnce(reply('{"baslik":"yanlış alan"}'))
      .mockResolvedValueOnce(reply('{"headline":"doğru"}'))
    expect((await callGenerate()).data.headline).toBe('doğru')
    expect(createMock).toHaveBeenCalledTimes(2)
  })

  // Akıl yürüten modellerde sık: düşünme jetonları bütçeyi bitirir,
  // `content` boş döner. Mesaj bunu açıkça söylemeli.
  it('jeton sınırına takılan boş yanıtı ayırt eder', async () => {
    createMock
      .mockResolvedValueOnce(reply(null, 'length'))
      .mockResolvedValueOnce(reply(null, 'length'))
      .mockResolvedValueOnce(reply(null, 'length'))

    await expect(callGenerate()).rejects.toMatchObject({
      code: 'invalid_response',
      message: expect.stringContaining('jeton sınırına'),
    })
  })

  it('bütçe biterse zaman aşımı hatası döner, sessizce beklemez', async () => {
    // Bütçe 5 sn, bir kademe için asgari 4 sn gerekiyor. İlk çağrı 1,2 sn
    // yerse geriye 3,8 sn kalır — ikinci kademeye yer yoktur.
    process.env.AI_BUDGET_MS = '5000'
    createMock.mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 1200))
      return reply('{"yanlis":"alan"}') // şemaya uymuyor → kademe ilerlemek ister
    })

    await expect(callGenerate()).rejects.toMatchObject({ code: 'invalid_response' })
    expect(createMock).toHaveBeenCalledTimes(1)
  })

  it('AI_STRUCTURED_OUTPUT=none ile doğrudan düz metin dener', async () => {
    process.env.AI_STRUCTURED_OUTPUT = 'none'
    createMock.mockResolvedValueOnce(reply('{"headline":"düz"}'))

    await callGenerate()
    expect(createMock).toHaveBeenCalledTimes(1)
    expect(requestAt(0).response_format).toBeUndefined()
  })

  it('AI_STRUCTURED_OUTPUT=json_object ile şema kademesini atlar', async () => {
    process.env.AI_STRUCTURED_OUTPUT = 'json_object'
    createMock.mockResolvedValueOnce(reply('{"headline":"nesne"}'))

    await callGenerate()
    expect(requestAt(0).response_format?.type).toBe('json_object')
  })

  it('yapılandırma yoksa kapalı hatası verir', async () => {
    delete process.env.AI_API_KEY
    await expect(callGenerate()).rejects.toMatchObject({ code: 'disabled' })
    expect(createMock).not.toHaveBeenCalled()
  })

  it('görsel isteğinde görsel modelini kullanır', async () => {
    createMock.mockResolvedValueOnce(reply('{"headline":"g"}'))
    await callGenerate('vision')
    expect(requestAt(0).model).toBe('saglayici/vision')
  })
})
