import { inAgeBand, suitsAge, type AgeBandSlug } from './age'
import type { CatalogBook, Language, LibraryIndex } from './data/types'
import { matchesTerms, searchTerms } from './search'

export type LanguageFilter = 'all' | Language
export type CollectionFilter = 'all' | 'favorites' | 'read' | 'unread' | 'to_read'
export type SortOrder = 'newest' | 'popular' | 'alphabetical'

export interface CatalogFilters {
  query: string
  language: LanguageFilter
  collection: CollectionFilter
  sort: SortOrder
  /** Sol menüden seçilen gelişim konusu. */
  topicSlug: string | null
  /** Filtre çubuğundan seçilen yaş kuşağı. */
  ageBand: AgeBandSlug | null
  /** Aktif çocuğun yaşı — seçiliyse yaşa uymayan kitaplar gizlenir. */
  childAge: number | null
}

export const DEFAULT_FILTERS: CatalogFilters = {
  query: '',
  language: 'all',
  collection: 'all',
  sort: 'newest',
  topicSlug: null,
  ageBand: null,
  childAge: null,
}

function matchesCollection(
  book: CatalogBook,
  collection: CollectionFilter,
  library: LibraryIndex,
): boolean {
  if (collection === 'all') return true
  const item = library[book.id]
  if (collection === 'favorites') return item?.isFavorite === true
  if (collection === 'read') return item?.status === 'read'
  if (collection === 'to_read') return item?.status === 'to_read'
  return item?.status !== 'read'
}

export function filterBooks(
  books: readonly CatalogBook[],
  filters: CatalogFilters,
  library: LibraryIndex = {},
): CatalogBook[] {
  const terms = searchTerms(filters.query)

  const result = books.filter((book) => {
    if (terms.length > 0) {
      const haystack = `${book.title} ${book.subtitle ?? ''} ${book.summary} ${book.authors.join(' ')}`
      if (!matchesTerms(haystack, terms)) return false
    }
    if (filters.language !== 'all' && book.language !== filters.language) return false
    if (!matchesCollection(book, filters.collection, library)) return false
    if (filters.topicSlug && !book.topicSlugs.includes(filters.topicSlug)) return false
    if (filters.ageBand && !inAgeBand(book, filters.ageBand)) return false
    if (!suitsAge(book, filters.childAge)) return false
    return true
  })

  return sortBooks(result, filters.sort)
}

export function sortBooks(books: CatalogBook[], sort: SortOrder): CatalogBook[] {
  const sorted = [...books]
  if (sort === 'popular') {
    sorted.sort((a, b) => b.likeCount - a.likeCount)
  } else if (sort === 'alphabetical') {
    sorted.sort((a, b) => a.title.localeCompare(b.title, 'tr'))
  } else {
    sorted.sort((a, b) => (b.postedAt ?? '').localeCompare(a.postedAt ?? ''))
  }
  return sorted
}

/** Filtrelerden en az biri varsayılandan farklıysa. */
export function hasActiveFilters(filters: CatalogFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.language !== 'all' ||
    filters.collection !== 'all' ||
    filters.topicSlug !== null ||
    filters.ageBand !== null
  )
}
