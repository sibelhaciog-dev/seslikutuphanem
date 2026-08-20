import { describe, expect, it } from 'vitest'
import { AREAS, indexItems, makeBook, makeItem } from '@/test/factories'
import { DEFAULT_FILTERS, filterBooks, hasActiveFilters, sortBooks } from './filters'

const CATALOG = [
  makeBook({
    id: 'a',
    title: 'Kaplan Çaya Geldi',
    summary: 'Arkadaşlık ve paylaşma üzerine.',
    likeCount: 10,
    postedAt: '2025-03-01',
    topicSlugs: ['paylasma'],
    areaSlugs: ['sosyal'],
    ageMin: 3,
    ageMax: 6,
  }),
  makeBook({
    id: 'b',
    title: 'The Paper Bag Princess',
    language: 'en',
    summary: 'Cesaret hikâyesi.',
    likeCount: 50,
    postedAt: '2025-01-01',
    ageMin: 5,
    ageMax: 9,
  }),
  makeBook({
    id: 'c',
    title: 'Ölüm Nedir?',
    summary: 'Büyükbabası vefat eden bir çocuğun hikâyesi.',
    likeCount: 5,
    postedAt: '2025-02-01',
    topicSlugs: ['duygu-yonetimi'],
    areaSlugs: ['duygu'],
    ageMin: 7,
    ageMax: 12,
  }),
]

describe('filterBooks', () => {
  it('varsayılan filtrelerde her kitabı döndürür', () => {
    expect(filterBooks(CATALOG, DEFAULT_FILTERS)).toHaveLength(3)
  })

  it('başlıkta arar', () => {
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, query: 'kaplan' })
    expect(result.map((book) => book.id)).toEqual(['a'])
  })

  it('özet metninde de arar', () => {
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, query: 'cesaret' })
    expect(result.map((book) => book.id)).toEqual(['b'])
  })

  it('aksan farkını yok sayar', () => {
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, query: 'olum' })
    expect(result.map((book) => book.id)).toEqual(['c'])
  })

  it('dile göre süzer', () => {
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, language: 'en' })
    expect(result.map((book) => book.id)).toEqual(['b'])
  })

  it('gelişim konusuna göre süzer', () => {
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, topicSlug: 'paylasma' })
    expect(result.map((book) => book.id)).toEqual(['a'])
  })

  it('yaş kuşağına göre süzer (kesişen aralıklar dahil)', () => {
    // 'b' 5–9 yaş: 9+ kuşağıyla kesiştiği için o da listelenir.
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, ageBand: 'ortaokul' })
    expect(result.map((book) => book.id)).toEqual(['c', 'b'])
  })

  it('yaş kuşağı dışındakileri eler', () => {
    // 'a' 3–6, 'b' 5–9, 'c' 7–12: hiçbiri 0–2 kuşağına girmiyor.
    expect(filterBooks(CATALOG, { ...DEFAULT_FILTERS, ageBand: 'bebek' })).toEqual([])
    // 3–5 kuşağı: 'a' (3–6) ve 'b' (5–9) kesişiyor, 'c' (7–12) kesişmiyor.
    const preschool = filterBooks(CATALOG, { ...DEFAULT_FILTERS, ageBand: 'okul-oncesi' })
    expect(preschool.map((book) => book.id)).toEqual(['a', 'b'])
  })

  it('çocuğun yaşına uymayanları gizler', () => {
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, childAge: 4 })
    expect(result.map((book) => book.id)).toEqual(['a'])
  })

  it('favorilere göre süzer', () => {
    const library = indexItems([makeItem({ bookId: 'b', isFavorite: true })])
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, collection: 'favorites' }, library)
    expect(result.map((book) => book.id)).toEqual(['b'])
  })

  it('okunanlara göre süzer', () => {
    const library = indexItems([makeItem({ bookId: 'c', status: 'read' })])
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, collection: 'read' }, library)
    expect(result.map((book) => book.id)).toEqual(['c'])
  })

  it('okuma listesine göre süzer', () => {
    const library = indexItems([makeItem({ bookId: 'a', status: 'to_read' })])
    const result = filterBooks(CATALOG, { ...DEFAULT_FILTERS, collection: 'to_read' }, library)
    expect(result.map((book) => book.id)).toEqual(['a'])
  })
})

describe('sortBooks', () => {
  it('beğeniye göre sıralar', () => {
    expect(sortBooks([...CATALOG], 'popular').map((book) => book.id)).toEqual(['b', 'a', 'c'])
  })

  it('tarihe göre yeniden eskiye sıralar', () => {
    expect(sortBooks([...CATALOG], 'newest').map((book) => book.id)).toEqual(['a', 'c', 'b'])
  })

  it('alfabetik sıralamada Türkçe harf sırasını kullanır', () => {
    expect(sortBooks([...CATALOG], 'alphabetical').map((book) => book.id)).toEqual(['a', 'c', 'b'])
  })
})

describe('hasActiveFilters', () => {
  it('varsayılanda kapalıdır', () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false)
  })

  it('yalnızca çocuk yaşı ayarlıysa filtre sayılmaz', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, childAge: 5 })).toBe(false)
  })

  it('konu seçilince açılır', () => {
    expect(hasActiveFilters({ ...DEFAULT_FILTERS, topicSlug: 'paylasma' })).toBe(true)
  })
})

describe('gelişim alanı verisi', () => {
  it('test taksonomisi konuları alanlara bağlar', () => {
    expect(AREAS.flatMap((area) => area.topics)).toHaveLength(3)
  })
})
