import type { AreaView, CatalogBook, Child, InterestView, LibraryItem } from '@/lib/data/types'

/** Testlerde kullanılan küçük veri üreticileri. */

export function makeBook(overrides: Partial<CatalogBook> & { id: string }): CatalogBook {
  return {
    slug: overrides.id,
    title: 'Kitap',
    subtitle: null,
    summary: '',
    language: 'tr',
    ageMin: 3,
    ageMax: 8,
    coverUrl: null,
    instagramUrl: null,
    likeCount: 0,
    postedAt: '2025-01-01',
    authors: [],
    topicSlugs: [],
    areaSlugs: [],
    interestSlugs: [],
    ...overrides,
  }
}

export function makeItem(overrides: Partial<LibraryItem> & { bookId: string }): LibraryItem {
  return {
    id: `item-${overrides.bookId}`,
    childId: 'child-1',
    customBookId: null,
    status: 'to_read',
    isFavorite: false,
    rating: 0,
    timesRead: 0,
    firstReadAt: null,
    lastReadAt: null,
    ...overrides,
  }
}

export function makeChild(overrides: Partial<Child> = {}): Child {
  return {
    id: 'child-1',
    name: 'Elif',
    birthDate: '2020-01-01',
    gender: 'girl',
    avatarCharacter: 'k1',
    avatarAccessories: [],
    position: 0,
    interestSlugs: [],
    focusTopicSlugs: [],
    ...overrides,
  }
}

export const AREAS: AreaView[] = [
  {
    slug: 'duygu',
    name: 'Duygu ve Davranış Rehberi',
    emoji: '❤️',
    color: '#E8602C',
    position: 1,
    topics: [
      { slug: 'duygu-yonetimi', name: 'Duygu Yönetimi', label: null, position: 1 },
      { slug: 'korku-ve-kaygi', name: 'Korku ve Kaygı', label: null, position: 2 },
    ],
  },
  {
    slug: 'sosyal',
    name: 'Sosyal İlişkiler Rehberi',
    emoji: '🤝',
    color: '#378ADD',
    position: 2,
    topics: [{ slug: 'paylasma', name: 'Paylaşma', label: null, position: 1 }],
  },
]

export const INTERESTS: InterestView[] = [
  { slug: 'uzay', name: 'Uzay', emoji: '🚀' },
  { slug: 'hayvanlar', name: 'Hayvanlar', emoji: '🐾' },
]

export function indexItems(items: LibraryItem[]): Record<string, LibraryItem> {
  return Object.fromEntries(items.map((item) => [item.bookId!, item]))
}
