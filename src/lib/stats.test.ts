import { describe, expect, it } from 'vitest'
import { AREAS, indexItems, makeBook, makeItem } from '@/test/factories'
import { groupSessionsByDate, longestStreak, ratingPoints, reportMessage, summarize } from './stats'

const CATALOG = [
  makeBook({ id: 'a', title: 'Duygular', topicSlugs: ['duygu-yonetimi'] }),
  makeBook({ id: 'b', title: 'Feelings', language: 'en', topicSlugs: ['korku-ve-kaygi'] }),
  makeBook({ id: 'c', title: 'Paylaşmak', topicSlugs: ['paylasma'] }),
]

const LIBRARY = indexItems([
  makeItem({ bookId: 'a', status: 'read', rating: 5, timesRead: 3, lastReadAt: '2026-01-03' }),
  makeItem({ bookId: 'b', status: 'read', rating: 3, timesRead: 1, lastReadAt: '2026-01-02' }),
  makeItem({ bookId: 'c', status: 'to_read', isFavorite: true }),
])

describe('summarize', () => {
  it('okunan ve puanlanan kitapları sayar', () => {
    const summary = summarize(CATALOG, LIBRARY, AREAS)
    expect(summary.booksRead).toBe(2)
    expect(summary.ratedCount).toBe(2)
    expect(summary.averageRating).toBe(4)
  })

  it('okuma listesindekileri ve favorileri sayar', () => {
    const summary = summarize(CATALOG, LIBRARY, AREAS)
    expect(summary.toRead).toBe(1)
    expect(summary.favorites).toBe(1)
  })

  it('tekrar okumaları toplar', () => {
    expect(summarize(CATALOG, LIBRARY, AREAS).totalSessions).toBe(4)
  })

  it('dil dağılımını hesaplar', () => {
    const summary = summarize(CATALOG, LIBRARY, AREAS)
    expect(summary.turkishCount).toBe(1)
    expect(summary.englishCount).toBe(1)
  })

  it('4+ yıldızlıları beğenilen sayar', () => {
    expect(summarize(CATALOG, LIBRARY, AREAS).lovedBooks.map((book) => book.id)).toEqual(['a'])
  })

  it('konuları gelişim alanına göre gruplar', () => {
    const summary = summarize(CATALOG, LIBRARY, AREAS)
    expect(summary.areaBreakdown).toEqual([expect.objectContaining({ slug: 'duygu', count: 2 })])
  })

  it('boş kütüphanede sıfır döner', () => {
    const summary = summarize(CATALOG, {}, AREAS)
    expect(summary.booksRead).toBe(0)
    expect(summary.averageRating).toBeNull()
  })
})

describe('longestStreak', () => {
  it('ardışık günleri sayar', () => {
    expect(longestStreak(['2026-01-01', '2026-01-02', '2026-01-03'])).toBe(3)
  })

  it('boşluklarda seriyi sıfırlar', () => {
    expect(longestStreak(['2026-01-01', '2026-01-02', '2026-01-05', '2026-01-06'])).toBe(2)
  })

  it('aynı günün tekrarını bir kez sayar', () => {
    expect(longestStreak(['2026-01-01', '2026-01-01'])).toBe(1)
  })

  it('boş listede sıfır döner', () => {
    expect(longestStreak([])).toBe(0)
  })
})

describe('ratingPoints', () => {
  it('puanlanan her kitap için bir puan verir', () => {
    expect(ratingPoints(LIBRARY)).toBe(2)
  })
})

describe('groupSessionsByDate', () => {
  it('okumaları güne göre gruplar', () => {
    const items = new Map(Object.values(LIBRARY).map((item) => [item.id, item]))
    const sessions = [
      { readOn: '2026-01-03', libraryItemId: 'item-a' },
      { readOn: '2026-01-03', libraryItemId: 'item-b' },
      { readOn: '2026-01-02', libraryItemId: 'item-a' },
    ]
    const grouped = groupSessionsByDate(sessions, items, CATALOG)
    expect(grouped.get('2026-01-03')?.map((book) => book.id)).toEqual(['a', 'b'])
    expect(grouped.get('2026-01-02')?.map((book) => book.id)).toEqual(['a'])
  })

  it('aynı gün aynı kitabı iki kez listelemez', () => {
    const items = new Map(Object.values(LIBRARY).map((item) => [item.id, item]))
    const sessions = [
      { readOn: '2026-01-03', libraryItemId: 'item-a' },
      { readOn: '2026-01-03', libraryItemId: 'item-a' },
    ]
    expect(groupSessionsByDate(sessions, items, CATALOG).get('2026-01-03')).toHaveLength(1)
  })
})

describe('reportMessage', () => {
  it('en çok okunan alandan bahseder', () => {
    const message = reportMessage(summarize(CATALOG, LIBRARY, AREAS))
    expect(message).toContain('duygu')
  })

  it('hiç okuma yoksa mesaj üretmez', () => {
    expect(reportMessage(summarize(CATALOG, {}, AREAS))).toBeNull()
  })
})
