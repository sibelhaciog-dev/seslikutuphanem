/** Uygulamanın kullandığı alan (domain) tipleri — veritabanı satırlarından türetilir. */

export type Language = 'tr' | 'en'
export type LibraryStatus = 'to_read' | 'reading' | 'read' | 'abandoned'
export type NoteVisibility = 'private' | 'family' | 'public'
export type Gender = 'girl' | 'boy' | 'unspecified'
export type ReadingMood = 'loved' | 'liked' | 'ok' | 'disliked'
export type ContributorRole = 'author' | 'illustrator' | 'translator' | 'editor'

export interface CatalogBook {
  id: string
  slug: string
  title: string
  subtitle: string | null
  summary: string
  language: Language
  ageMin: number | null
  ageMax: number | null
  coverUrl: string | null
  instagramUrl: string | null
  likeCount: number
  postedAt: string | null
  authors: string[]
  topicSlugs: string[]
  areaSlugs: string[]
  interestSlugs: string[]
}

export interface BookContributor {
  slug: string
  name: string
  role: ContributorRole
}

export interface BookTopicRef {
  topicSlug: string
  topicName: string
  areaSlug: string
  areaName: string
  emoji: string
  color: string
  relevance: number
}

export interface BookDetail extends CatalogBook {
  description: string | null
  originalTitle: string | null
  pageCount: number | null
  publishedYear: number | null
  isbn13: string | null
  publisherName: string | null
  seriesTitle: string | null
  seriesSlug: string | null
  contributors: BookContributor[]
  topics: BookTopicRef[]
}

export interface TopicView {
  slug: string
  name: string
  label: string | null
  position: number
}

export interface AreaView {
  slug: string
  name: string
  emoji: string
  color: string
  position: number
  topics: TopicView[]
}

export interface InterestView {
  slug: string
  name: string
  emoji: string
}

export interface Child {
  id: string
  name: string
  birthDate: string | null
  gender: Gender
  avatarCharacter: string
  avatarAccessories: string[]
  position: number
  interestSlugs: string[]
  focusTopicSlugs: string[]
}

export interface LibraryItem {
  id: string
  childId: string
  bookId: string | null
  customBookId: string | null
  status: LibraryStatus
  isFavorite: boolean
  rating: number
  timesRead: number
  firstReadAt: string | null
  lastReadAt: string | null
}

export type LibraryIndex = Readonly<Record<string, LibraryItem>>

export interface CustomBook {
  id: string
  title: string
  authorName: string | null
  summary: string | null
  coverUrl: string | null
  origin: 'catalog' | 'camera' | 'manual'
}

export interface ReadingNote {
  id: string
  libraryItemId: string
  body: string
  visibility: NoteVisibility
  createdAt: string
}

export interface ReadingSession {
  id: string
  libraryItemId: string
  readOn: string
  minutes: number | null
  mood: ReadingMood | null
  note: string | null
}

export interface AchievementView {
  slug: string
  name: string
  description: string
  emoji: string
  points: number
  position: number
  earnedAt: string | null
}

export const EMPTY_LIBRARY_ITEM: Omit<LibraryItem, 'id' | 'childId' | 'bookId'> = {
  customBookId: null,
  status: 'to_read',
  isFavorite: false,
  rating: 0,
  timesRead: 0,
  firstReadAt: null,
  lastReadAt: null,
}
