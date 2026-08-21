import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeBook } from '@/test/factories'
import type { Recommendation } from '@/lib/recommendations'
import { selectRecommendations } from './recommend'
import type * as ClientModule from './client'

// `vi.mock` fabrikası modül yüklenirken çalışıyor; sıradan bir `const`
// henüz tanımlı olmuyor. `vi.hoisted` bunu yukarı taşıyor.
const { generateJsonMock } = vi.hoisted(() => ({ generateJsonMock: vi.fn() }))

vi.mock('./client', async (importOriginal) => {
  const actual = await importOriginal<typeof ClientModule>()
  return { ...actual, generateJson: generateJsonMock }
})

function candidate(id: string, title: string): Recommendation {
  return { book: makeBook({ id, title }), score: 1, reasons: [] }
}

const POOL = [candidate('a', 'Aslan ve Kuş'), candidate('b', 'Çaya Gelen Kaplan')]

const CONTEXT = {
  childName: 'Elif',
  childAge: 5,
  modeName: 'Sakinleşelim',
  modeHint: null,
  prompt: 'uyku öncesi',
  lovedTitles: [],
}

function aiReturns(picks: Array<{ bookId: string; reason: string }>) {
  generateJsonMock.mockResolvedValueOnce({
    data: { picks },
    model: 'test/model',
    totalTokens: 100,
  })
}

describe('selectRecommendations', () => {
  beforeEach(() => generateJsonMock.mockReset())

  it('havuzdaki seçimleri kitaplara bağlar', async () => {
    aiReturns([{ bookId: 'a', reason: 'Sakin bir hikâye.' }])
    const result = await selectRecommendations(POOL, CONTEXT)
    expect(result.picks).toHaveLength(1)
    expect(result.picks[0]!.book.id).toBe('a')
    expect(result.picks[0]!.reason).toBe('Sakin bir hikâye.')
  })

  // ADR 0007'nin yükünü taşıyan davranış: model havuz dışına çıkamaz.
  it('havuzda olmayan kimliği ATAR', async () => {
    aiReturns([
      { bookId: 'a', reason: 'Gerçek kitap.' },
      { bookId: 'uydurma-kitap-123', reason: 'Bu kitap yok.' },
    ])
    const result = await selectRecommendations(POOL, CONTEXT)
    expect(result.picks).toHaveLength(1)
    expect(result.picks[0]!.book.id).toBe('a')
  })

  it('tamamı uydurmaysa hata verir (çağıran deterministiğe düşer)', async () => {
    aiReturns([
      { bookId: 'yok-1', reason: '...' },
      { bookId: 'yok-2', reason: '...' },
    ])
    await expect(selectRecommendations(POOL, CONTEXT)).rejects.toMatchObject({
      code: 'invalid_response',
    })
  })

  it('aynı kitabı iki kez seçerse tekilleştirir', async () => {
    aiReturns([
      { bookId: 'a', reason: 'Bir.' },
      { bookId: 'a', reason: 'İki.' },
    ])
    const result = await selectRecommendations(POOL, CONTEXT)
    expect(result.picks).toHaveLength(1)
  })

  it('boşluklu kimliği de eşleştirir', async () => {
    aiReturns([{ bookId: '  b  ', reason: 'Kırpılmalı.' }])
    const result = await selectRecommendations(POOL, CONTEXT)
    expect(result.picks[0]!.book.id).toBe('b')
  })

  it('boş havuzda sağlayıcıya hiç gitmez', async () => {
    await expect(selectRecommendations([], CONTEXT)).rejects.toMatchObject({
      code: 'invalid_response',
    })
    expect(generateJsonMock).not.toHaveBeenCalled()
  })

  it('modele yalnızca havuzdaki kitapları verir', async () => {
    aiReturns([{ bookId: 'a', reason: 'x' }])
    await selectRecommendations(POOL, CONTEXT)

    const call = generateJsonMock.mock.calls[0]![0]
    const userMessage = call.messages.find((m: { role: string }) => m.role === 'user').content
    expect(userMessage).toContain('a :: Aslan ve Kuş')
    expect(userMessage).toContain('b :: Çaya Gelen Kaplan')
    // Bağlam da geçmeli ki gerekçe kişisel olsun.
    expect(userMessage).toContain('Elif')
    expect(userMessage).toContain('Sakinleşelim')
    expect(userMessage).toContain('uyku öncesi')
  })

  it('profil yoksa modele bunu söyler', async () => {
    aiReturns([{ bookId: 'a', reason: 'x' }])
    await selectRecommendations(POOL, { ...CONTEXT, childName: null, childAge: null })

    const userMessage = generateJsonMock.mock.calls[0]![0].messages.find(
      (m: { role: string }) => m.role === 'user',
    ).content
    expect(userMessage).toContain('Çocuk profili yok')
  })

  it('sağlayıcı hatasını olduğu gibi yukarı taşır', async () => {
    generateJsonMock.mockRejectedValueOnce(
      Object.assign(new Error('Sağlayıcı hız sınırına takıldı.'), { code: 'rate_limited' }),
    )
    await expect(selectRecommendations(POOL, CONTEXT)).rejects.toMatchObject({
      code: 'rate_limited',
    })
  })
})
