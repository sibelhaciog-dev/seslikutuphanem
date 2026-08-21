import { describe, expect, it } from 'vitest'
import { AREAS, INTERESTS, indexItems, makeBook, makeChild, makeItem } from '@/test/factories'
import { candidatePool, recommendForChild, similarBooks } from './recommendations'

const TAXONOMY = { areas: AREAS, interests: INTERESTS }

const CATALOG = [
  makeBook({
    id: 'kaynak',
    title: 'Kardeşim Geliyor',
    summary: 'Yeni bebek kardeş kıskançlığı hikâyesi.',
    topicSlugs: ['duygu-yonetimi'],
    areaSlugs: ['duygu'],
  }),
  makeBook({
    id: 'benzer',
    title: 'Kardeş Olmak',
    summary: 'Kıskançlık ve kardeş sevgisi üzerine.',
    topicSlugs: ['duygu-yonetimi'],
    areaSlugs: ['duygu'],
  }),
  makeBook({
    id: 'uzak',
    title: 'Uzay Yolculuğu',
    summary: 'Gezegenler arasında bir roket macerası.',
    language: 'en',
    ageMin: 7,
    ageMax: 12,
    interestSlugs: ['uzay'],
  }),
  makeBook({
    id: 'okunmus',
    title: 'Dişçiye Gidiyorum',
    summary: 'Diş fırçalama alışkanlığı üzerine.',
  }),
]

describe('similarBooks', () => {
  it('aynı konudaki kitabı öne çıkarır', () => {
    expect(similarBooks(CATALOG[0]!, CATALOG, {}, TAXONOMY)[0]?.book.id).toBe('benzer')
  })

  it('kaynağın kendisini önermez', () => {
    const ids = similarBooks(CATALOG[0]!, CATALOG, {}, TAXONOMY).map((entry) => entry.book.id)
    expect(ids).not.toContain('kaynak')
  })

  it('okunmuş kitabı önermez', () => {
    const library = indexItems([makeItem({ bookId: 'benzer', status: 'read' })])
    const ids = similarBooks(CATALOG[0]!, CATALOG, library, TAXONOMY).map((entry) => entry.book.id)
    expect(ids).not.toContain('benzer')
  })

  it('yarım bırakılan kitabı önermez', () => {
    const library = indexItems([makeItem({ bookId: 'benzer', status: 'abandoned' })])
    const ids = similarBooks(CATALOG[0]!, CATALOG, library, TAXONOMY).map((entry) => entry.book.id)
    expect(ids).not.toContain('benzer')
  })

  it('ortak konuyu okunabilir adıyla gösterir', () => {
    const top = similarBooks(CATALOG[0]!, CATALOG, {}, TAXONOMY)[0]
    expect(top?.reasons).toContain('Duygu Yönetimi')
  })
})

describe('recommendForChild', () => {
  const child = makeChild({
    birthDate: '2019-01-01',
    interestSlugs: ['uzay'],
    focusTopicSlugs: ['duygu-yonetimi'],
  })

  it('öncelikli konuyu en üste taşır', () => {
    const library = indexItems([makeItem({ bookId: 'okunmus', status: 'read', rating: 5 })])
    const result = recommendForChild(child, CATALOG, library, TAXONOMY)
    expect(result[0]?.book.id).toBe('benzer')
    expect(result.map((entry) => entry.book.id)).not.toContain('okunmus')
  })

  it('ilgi alanını gerekçe olarak gösterir', () => {
    const result = recommendForChild(child, CATALOG, {}, TAXONOMY)
    const space = result.find((entry) => entry.book.id === 'uzak')
    expect(space?.reasons).toContain('Uzay')
  })

  it('yaşa uymayan kitabı önermez', () => {
    const toddler = makeChild({ birthDate: '2023-01-01', interestSlugs: ['uzay'] })
    const ids = recommendForChild(toddler, CATALOG, {}, TAXONOMY).map((entry) => entry.book.id)
    expect(ids).not.toContain('uzak')
  })

  it('profil yoksa boş liste döner', () => {
    expect(recommendForChild(null, CATALOG, {}, TAXONOMY)).toEqual([])
  })
})

describe('candidatePool', () => {
  const child = makeChild({ interestSlugs: ['uzay'], focusTopicSlugs: [] })

  it('mod ağırlığı sıralamayı değiştirir', () => {
    const pool = candidatePool(child, CATALOG, {}, TAXONOMY, {
      topicWeights: { 'duygu-yonetimi': 5 },
    })
    expect(pool[0]!.book.topicSlugs).toContain('duygu-yonetimi')
  })

  // Profil verilmiyor: yaş süzgeci devreye girip 'uzak' kitabını elemesin,
  // ölçmek istediğimiz yalnızca serbest metnin etkisi.
  it('serbest metindeki kelime eşleşmesi puan getirir', () => {
    const withPrompt = candidatePool(null, CATALOG, {}, TAXONOMY, { prompt: 'roket gezegen uzay' })
    const withoutPrompt = candidatePool(null, CATALOG, {}, TAXONOMY, {})
    const scoreOf = (pool: ReturnType<typeof candidatePool>, id: string) =>
      pool.find((entry) => entry.book.id === id)?.score ?? 0
    expect(scoreOf(withPrompt, 'uzak')).toBeGreaterThan(scoreOf(withoutPrompt, 'uzak'))
  })

  // Havuz boş kalırsa yapay zekânın seçecek bir şeyi olmaz.
  it('hiçbir sinyal yokken bile havuz boş dönmez', () => {
    const pool = candidatePool(null, CATALOG, {}, TAXONOMY, {})
    expect(pool.length).toBeGreaterThan(0)
  })

  it('okunmuş ve yarım bırakılmış kitapları havuza almaz', () => {
    const library = indexItems([
      makeItem({ bookId: 'okunmus', status: 'read' }),
      makeItem({ bookId: 'benzer', status: 'abandoned' }),
    ])
    const ids = candidatePool(child, CATALOG, library, TAXONOMY, {}).map((entry) => entry.book.id)
    expect(ids).not.toContain('okunmus')
    expect(ids).not.toContain('benzer')
  })

  // Yaş güvenliği bu katmanda; modele güvenilmiyor (ADR 0007).
  it('yaşa uymayan kitabı havuza almaz', () => {
    const küçük = makeChild({ birthDate: `${new Date().getFullYear() - 3}-01-01` })
    const ids = candidatePool(küçük, CATALOG, {}, TAXONOMY, {}).map((entry) => entry.book.id)
    expect(ids).not.toContain('uzak')
  })

  it('istenen sayıdan fazla aday döndürmez', () => {
    expect(candidatePool(child, CATALOG, {}, TAXONOMY, {}, 2)).toHaveLength(2)
  })
})
