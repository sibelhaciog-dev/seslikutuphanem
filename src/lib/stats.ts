import type { AreaView, CatalogBook, LibraryIndex, LibraryItem } from './data/types'

export interface AreaBreakdown {
  slug: string
  name: string
  emoji: string
  color: string
  count: number
}

export interface ReadingSummary {
  booksRead: number
  toRead: number
  ratedCount: number
  favorites: number
  totalSessions: number
  averageRating: number | null
  lovedBooks: CatalogBook[]
  turkishCount: number
  englishCount: number
  areaBreakdown: AreaBreakdown[]
}

const EMPTY_SUMMARY: ReadingSummary = {
  booksRead: 0,
  toRead: 0,
  ratedCount: 0,
  favorites: 0,
  totalSessions: 0,
  averageRating: null,
  lovedBooks: [],
  turkishCount: 0,
  englishCount: 0,
  areaBreakdown: [],
}

export function summarize(
  books: readonly CatalogBook[],
  library: LibraryIndex,
  areas: readonly AreaView[] = [],
): ReadingSummary {
  const items = Object.values(library)
  if (items.length === 0) return EMPTY_SUMMARY

  const booksById = new Map(books.map((book) => [book.id, book]))
  const readBooks = items
    .filter((item) => item.status === 'read' && item.bookId)
    .map((item) => booksById.get(item.bookId!))
    .filter((book): book is CatalogBook => Boolean(book))

  const rated = items.filter((item) => item.rating > 0)
  const totalRating = rated.reduce((sum, item) => sum + item.rating, 0)

  const areaBySlug = new Map(areas.map((area) => [area.slug, area]))
  const topicToArea = new Map<string, string>()
  for (const area of areas) {
    for (const topic of area.topics) topicToArea.set(topic.slug, area.slug)
  }

  const areaCounts = new Map<string, number>()
  for (const book of readBooks) {
    const seen = new Set<string>()
    for (const topicSlug of book.topicSlugs) {
      const areaSlug = topicToArea.get(topicSlug)
      if (!areaSlug || seen.has(areaSlug)) continue
      seen.add(areaSlug)
      areaCounts.set(areaSlug, (areaCounts.get(areaSlug) ?? 0) + 1)
    }
  }

  return {
    booksRead: readBooks.length,
    toRead: items.filter((item) => item.status === 'to_read').length,
    ratedCount: rated.length,
    favorites: items.filter((item) => item.isFavorite).length,
    totalSessions: items.reduce((sum, item) => sum + item.timesRead, 0),
    averageRating: rated.length > 0 ? totalRating / rated.length : null,
    lovedBooks: readBooks
      .filter((book) => (library[book.id]?.rating ?? 0) >= 4)
      .sort((a, b) => (library[b.id]?.rating ?? 0) - (library[a.id]?.rating ?? 0)),
    turkishCount: readBooks.filter((book) => book.language === 'tr').length,
    englishCount: readBooks.filter((book) => book.language === 'en').length,
    areaBreakdown: [...areaCounts.entries()]
      .map(([slug, count]) => {
        const area = areaBySlug.get(slug)
        return {
          slug,
          name: area?.name.replace(' Rehberi', '') ?? slug,
          emoji: area?.emoji ?? '📚',
          color: area?.color ?? '#8E8E93',
          count,
        }
      })
      .sort((a, b) => b.count - a.count),
  }
}

/** Arka arkaya okuma yapılan en uzun gün serisi. */
export function longestStreak(dates: Iterable<string>): number {
  const sorted = [...new Set(dates)].sort()
  let longest = 0
  let current = 0
  let previous: number | null = null

  for (const date of sorted) {
    const time = new Date(`${date}T00:00:00`).getTime()
    current = previous !== null && (time - previous) / 86_400_000 === 1 ? current + 1 : 1
    longest = Math.max(longest, current)
    previous = time
  }
  return longest
}

/** Yıldız puanı: puanlanan her kitap 1 puan (başarım puanları ayrıca eklenir). */
export function ratingPoints(library: LibraryIndex): number {
  return Object.values(library).filter((item) => item.rating > 0).length
}

export function reportMessage(summary: ReadingSummary): string | null {
  const top = summary.areaBreakdown[0]
  if (!top || summary.booksRead === 0) return null

  let message = `Bu dönem ağırlıklı olarak ${top.name.toLocaleLowerCase('tr-TR')} üzerine kitaplar okundu.`
  if (summary.totalSessions > summary.booksRead * 1.5) {
    message += ' Bazı kitaplar defalarca okunmuş — sevilen kitap iyi kitaptır!'
  } else if (summary.booksRead >= 5) {
    message += ' Harika bir okuma alışkanlığı!'
  } else if (summary.booksRead >= 2) {
    message += ' Güzel bir başlangıç!'
  }
  return message
}

/** Okuma günlerini takvim için gruplar. */
export function groupSessionsByDate(
  sessions: readonly { readOn: string; libraryItemId: string }[],
  itemsById: ReadonlyMap<string, LibraryItem>,
  books: readonly CatalogBook[],
): Map<string, CatalogBook[]> {
  const booksById = new Map(books.map((book) => [book.id, book]))
  const grouped = new Map<string, CatalogBook[]>()

  for (const session of sessions) {
    const item = itemsById.get(session.libraryItemId)
    if (!item?.bookId) continue
    const book = booksById.get(item.bookId)
    if (!book) continue
    const list = grouped.get(session.readOn) ?? []
    if (!list.some((entry) => entry.id === book.id)) list.push(book)
    grouped.set(session.readOn, list)
  }
  return grouped
}
