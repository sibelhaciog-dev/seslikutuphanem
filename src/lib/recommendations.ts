import type { AreaView, CatalogBook, Child, InterestView, LibraryIndex } from './data/types'
import { suitsAge } from './age'
import { normalize } from './search'

export interface Recommendation {
  book: CatalogBook
  score: number
  /** Kullanıcıya "neden önerildi" olarak gösterilen kısa etiketler. */
  reasons: string[]
}

const STOP_WORDS = new Set([
  'bir',
  've',
  'ile',
  'bu',
  'su',
  'ama',
  'icin',
  'gibi',
  'daha',
  'cok',
  'kadar',
  'olan',
  'olarak',
  'sonra',
  'once',
  'onun',
  'kendi',
  'hepsi',
  'the',
  'and',
  'of',
  'for',
  'with',
  'that',
  'this',
  'from',
  'your',
  'you',
])

function themeWords(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((word) => word.length > 3 && !STOP_WORDS.has(word))
}

function bookText(book: CatalogBook): string {
  return `${book.title} ${book.subtitle ?? ''} ${book.summary}`
}

function unreadBooks(books: readonly CatalogBook[], library: LibraryIndex): CatalogBook[] {
  return books.filter((book) => {
    const status = library[book.id]?.status
    return status !== 'read' && status !== 'abandoned'
  })
}

function topScored(items: Recommendation[], limit: number): Recommendation[] {
  return items
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.book.likeCount - a.book.likeCount)
    .slice(0, limit)
}

/** Konu slug'larını okunabilir adlara çevirir. */
function topicNameMap(areas: readonly AreaView[]): Map<string, string> {
  return new Map(areas.flatMap((area) => area.topics.map((topic) => [topic.slug, topic.name])))
}

/** Ortak kelimeler gerekçe olarak gösterilirken ilk harfi büyütülür. */
function asLabel(word: string): string {
  return word.charAt(0).toLocaleUpperCase('tr-TR') + word.slice(1)
}

/** "Bu kitabı sevdiyseniz" — açık olan kitaba en yakın, okunmamış kitaplar. */
export function similarBooks(
  source: CatalogBook,
  books: readonly CatalogBook[],
  library: LibraryIndex,
  taxonomy: { areas: readonly AreaView[] },
  limit = 5,
): Recommendation[] {
  const sourceWords = new Set(themeWords(bookText(source)))
  const sourceTopics = new Set(source.topicSlugs)
  const sourceAreas = new Set(source.areaSlugs)
  const topicNames = topicNameMap(taxonomy.areas)

  const scored = unreadBooks(books, library)
    .filter((book) => book.id !== source.id)
    .map((book) => {
      let score = 0

      const sharedTopics = book.topicSlugs.filter((slug) => sourceTopics.has(slug))
      score += sharedTopics.length * 6

      const sharedAreas = book.areaSlugs.filter((slug) => sourceAreas.has(slug))
      score += sharedAreas.length * 3

      const sharedWords = [
        ...new Set(themeWords(bookText(book)).filter((word) => sourceWords.has(word))),
      ]
      score += sharedWords.length * 3

      if (book.language === source.language) score += 3
      if (
        source.ageMin !== null &&
        book.ageMin !== null &&
        Math.abs(book.ageMin - source.ageMin) <= 1
      ) {
        score += 4
      }

      // Gerekçe olarak önce konu adları; yer kalırsa ortak kelimeler.
      const reasons = [
        ...sharedTopics.map((slug) => topicNames.get(slug) ?? slug),
        ...sharedWords.map(asLabel),
      ]

      return { book, score, reasons: [...new Set(reasons)].slice(0, 3) }
    })

  return topScored(scored, limit)
}

/**
 * Çocuğa özel öneri.
 *
 * Sıralamayı bu deterministik motor yapar; yapay zekâ yalnızca sonucu
 * anlatan metni yazar (PRD ilke 5).
 */
export function recommendForChild(
  child: Child | null,
  books: readonly CatalogBook[],
  library: LibraryIndex,
  taxonomy: { areas: readonly AreaView[]; interests: readonly InterestView[] },
  limit = 5,
): Recommendation[] {
  const readBooks = books.filter((book) => library[book.id]?.status === 'read')
  const loved = readBooks.filter((book) => (library[book.id]?.rating ?? 0) >= 4)
  const basis = loved.length > 0 ? loved : readBooks

  const themeSet = new Set(basis.flatMap((book) => themeWords(bookText(book))))
  const topicWeights = new Map<string, number>()
  const languageWeights = new Map<string, number>()

  for (const book of basis) {
    const weight = Math.max(1, library[book.id]?.rating ?? 1)
    for (const topicSlug of book.topicSlugs) {
      topicWeights.set(topicSlug, (topicWeights.get(topicSlug) ?? 0) + weight)
    }
    languageWeights.set(book.language, (languageWeights.get(book.language) ?? 0) + weight)
  }

  const interestNames = new Map(taxonomy.interests.map((item) => [item.slug, item.name]))
  const topicNames = new Map(
    taxonomy.areas.flatMap((area) => area.topics.map((topic) => [topic.slug, topic.name])),
  )

  const childInterests = new Set(child?.interestSlugs ?? [])
  const focusTopics = new Set(child?.focusTopicSlugs ?? [])
  const childAge = child?.birthDate
    ? new Date().getFullYear() - new Date(child.birthDate).getFullYear()
    : null

  const scored = unreadBooks(books, library)
    // Yaşa uymayan kitap önerilmez.
    .filter((book) => suitsAge(book, childAge))
    .map((book) => {
      const reasons: string[] = []
      let score = 0

      for (const topicSlug of book.topicSlugs) {
        if (focusTopics.has(topicSlug)) {
          score += 10
          reasons.push(topicNames.get(topicSlug) ?? topicSlug)
        }
        score += topicWeights.get(topicSlug) ?? 0
      }

      for (const interestSlug of book.interestSlugs) {
        if (childInterests.has(interestSlug)) {
          score += 7
          reasons.push(interestNames.get(interestSlug) ?? interestSlug)
        }
      }

      const shared = [...new Set(themeWords(bookText(book)).filter((word) => themeSet.has(word)))]
      score += shared.length * 2
      reasons.push(...shared.slice(0, 1))

      score += languageWeights.get(book.language) ?? 0

      // Hiç okuma yoksa bile beğenilen kitaplar öne çıksın.
      if (basis.length === 0) score += Math.min(book.likeCount / 20, 3)

      return { book, score, reasons: [...new Set(reasons)].slice(0, 3) }
    })

  return topScored(scored, limit)
}
