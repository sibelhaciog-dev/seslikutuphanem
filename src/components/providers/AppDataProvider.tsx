'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { createClient } from '@/lib/supabase/client'
import * as api from '@/lib/data/library'
import type {
  AchievementView,
  AreaView,
  Child,
  CustomBook,
  InterestView,
  LibraryIndex,
  LibraryItem,
  LibraryStatus,
  ReadingSession,
} from '@/lib/data/types'

const ACTIVE_CHILD_KEY = 'sk.activeChildId'

export interface Taxonomy {
  areas: AreaView[]
  interests: InterestView[]
}

interface AppData {
  loading: boolean
  isAuthenticated: boolean
  isStaff: boolean
  userId: string | null
  userEmail: string | null
  /** Yapay zekâ sağlayıcısı yapılandırılmış mı? */
  aiEnabled: boolean

  taxonomy: Taxonomy
  children: Child[]
  activeChild: Child | null
  activeChildId: string | null
  setActiveChildId: (id: string) => void

  /** Katalog kitabı kimliğine göre kütüphane kayıtları. */
  library: LibraryIndex
  /** Kullanıcının kendi eklediği kitaplar ve kayıtları. */
  customBooks: CustomBook[]
  customItems: LibraryItem[]
  sessions: ReadingSession[]
  achievements: AchievementView[]
  points: number

  setStatus: (bookId: string, status: LibraryStatus) => Promise<void>
  toggleFavorite: (bookId: string) => Promise<void>
  setRating: (bookId: string, rating: number) => Promise<void>
  logSession: (bookId: string, readOn?: string) => Promise<void>
  removeSession: (sessionId: string) => Promise<void>
  addCustomBook: (input: {
    title: string
    authorName?: string | null
    summary?: string | null
    origin: 'camera' | 'manual'
  }) => Promise<void>
  removeItem: (itemId: string) => Promise<void>
  refreshChildren: () => Promise<void>
  refreshLibrary: () => Promise<void>
}

const AppDataContext = createContext<AppData | null>(null)

interface ProviderProps {
  children: ReactNode
  userId: string | null
  userEmail: string | null
  isStaff: boolean
  taxonomy: Taxonomy
  aiEnabled: boolean
}

export function AppDataProvider({
  children: node,
  userId,
  userEmail,
  isStaff,
  taxonomy,
  aiEnabled,
}: ProviderProps) {
  const supabase = createClient()
  const [loading, setLoading] = useState(Boolean(userId))
  const [childList, setChildList] = useState<Child[]>([])
  const [activeChildId, setActiveChildIdState] = useState<string | null>(null)
  const [items, setItems] = useState<LibraryItem[]>([])
  const [customBooks, setCustomBooks] = useState<CustomBook[]>([])
  const [sessions, setSessions] = useState<ReadingSession[]>([])
  const [achievements, setAchievements] = useState<AchievementView[]>([])
  const [points, setPoints] = useState(0)

  const refreshChildren = useCallback(async () => {
    if (!userId) {
      setChildList([])
      setLoading(false)
      return
    }
    const loaded = await api.loadChildren(supabase)
    setChildList(loaded)
    setActiveChildIdState((current) => {
      if (current && loaded.some((child) => child.id === current)) return current
      const stored = typeof window === 'undefined' ? null : localStorage.getItem(ACTIVE_CHILD_KEY)
      if (stored && loaded.some((child) => child.id === stored)) return stored
      return loaded[0]?.id ?? null
    })
    setLoading(false)
  }, [supabase, userId])

  const refreshLibrary = useCallback(async () => {
    if (!activeChildId) {
      setItems([])
      setSessions([])
      setAchievements([])
      setPoints(0)
      return
    }
    const [loadedItems, loadedSessions, loadedCustom, loadedAchievements, loadedPoints] =
      await Promise.all([
        api.loadLibraryItems(supabase, activeChildId),
        api.loadSessions(supabase, activeChildId),
        api.loadCustomBooks(supabase),
        api.loadAchievements(supabase, activeChildId),
        api.loadChildPoints(supabase, activeChildId),
      ])
    setItems(loadedItems)
    setSessions(loadedSessions)
    setCustomBooks(loadedCustom)
    setAchievements(loadedAchievements)
    setPoints(loadedPoints)
  }, [supabase, activeChildId])

  useEffect(() => {
    void refreshChildren()
  }, [refreshChildren])

  useEffect(() => {
    void refreshLibrary()
  }, [refreshLibrary])

  const setActiveChildId = useCallback((id: string) => {
    setActiveChildIdState(id)
    try {
      localStorage.setItem(ACTIVE_CHILD_KEY, id)
    } catch {
      // Gizli sekmede localStorage kapalı olabilir — sorun değil.
    }
  }, [])

  const library = useMemo<LibraryIndex>(() => {
    const index: Record<string, LibraryItem> = {}
    for (const item of items) {
      if (item.bookId) index[item.bookId] = item
    }
    return index
  }, [items])

  const customItems = useMemo(() => items.filter((item) => item.customBookId), [items])

  /** Kaydı iyimser günceller, sunucu hatasında geri alır. */
  const applyPatch = useCallback(
    async (bookId: string, patch: api.LibraryPatch) => {
      if (!activeChildId) return
      const previous = items
      const existing = items.find((item) => item.bookId === bookId)

      setItems((current) => {
        if (existing) {
          return current.map((item) => (item.id === existing.id ? { ...item, ...patch } : item))
        }
        return [
          ...current,
          {
            id: `optimistic-${bookId}`,
            childId: activeChildId,
            bookId,
            customBookId: null,
            status: 'to_read',
            isFavorite: false,
            rating: 0,
            timesRead: 0,
            firstReadAt: null,
            lastReadAt: null,
            ...patch,
          },
        ]
      })

      try {
        const saved = await api.upsertLibraryItem(supabase, {
          childId: activeChildId,
          bookId,
          patch,
        })
        setItems((current) => {
          const without = current.filter(
            (item) => item.bookId !== bookId && item.id !== `optimistic-${bookId}`,
          )
          return [...without, saved]
        })
        void api.evaluateAchievements(supabase, activeChildId)
      } catch (error) {
        setItems(previous)
        throw error
      }
    },
    [supabase, activeChildId, items],
  )

  const setStatus = useCallback(
    (bookId: string, status: LibraryStatus) => applyPatch(bookId, { status }),
    [applyPatch],
  )

  const toggleFavorite = useCallback(
    (bookId: string) => {
      const current = library[bookId]?.isFavorite ?? false
      return applyPatch(bookId, { isFavorite: !current })
    },
    [applyPatch, library],
  )

  const setRating = useCallback(
    (bookId: string, rating: number) =>
      // Yıldızı geri almak kitabı "okunmadı" yapmamalı.
      applyPatch(bookId, rating > 0 ? { rating, status: 'read' } : { rating }),
    [applyPatch],
  )

  const logSession = useCallback(
    async (bookId: string, readOn?: string) => {
      if (!activeChildId) return
      let item = items.find((entry) => entry.bookId === bookId)
      if (!item) {
        item = await api.upsertLibraryItem(supabase, {
          childId: activeChildId,
          bookId,
          patch: { status: 'read' },
        })
      }
      const session = await api.logReadingSession(supabase, {
        libraryItemId: item.id,
        readOn,
      })
      setSessions((current) => [session, ...current])
      await api.evaluateAchievements(supabase, activeChildId)
      await refreshLibrary()
    },
    [supabase, activeChildId, items, refreshLibrary],
  )

  const removeSession = useCallback(
    async (sessionId: string) => {
      const previous = sessions
      setSessions((current) => current.filter((session) => session.id !== sessionId))
      try {
        await api.deleteReadingSession(supabase, sessionId)
        await refreshLibrary()
      } catch (error) {
        setSessions(previous)
        throw error
      }
    },
    [supabase, sessions, refreshLibrary],
  )

  const addCustomBook = useCallback(
    async (input: {
      title: string
      authorName?: string | null
      summary?: string | null
      origin: 'camera' | 'manual'
    }) => {
      if (!userId || !activeChildId) return
      const book = await api.createCustomBook(supabase, { ownerId: userId, ...input })
      await api.upsertLibraryItem(supabase, {
        childId: activeChildId,
        customBookId: book.id,
        addedFrom: input.origin,
        patch: { status: 'to_read' },
      })
      await refreshLibrary()
    },
    [supabase, userId, activeChildId, refreshLibrary],
  )

  const removeItem = useCallback(
    async (itemId: string) => {
      const previous = items
      setItems((current) => current.filter((item) => item.id !== itemId))
      try {
        await api.deleteLibraryItem(supabase, itemId)
      } catch (error) {
        setItems(previous)
        throw error
      }
    },
    [supabase, items],
  )

  const value = useMemo<AppData>(
    () => ({
      loading,
      isAuthenticated: Boolean(userId),
      isStaff,
      aiEnabled,
      userId,
      userEmail,
      taxonomy,
      children: childList,
      activeChild: childList.find((child) => child.id === activeChildId) ?? null,
      activeChildId,
      setActiveChildId,
      library,
      customBooks,
      customItems,
      sessions,
      achievements,
      points,
      setStatus,
      toggleFavorite,
      setRating,
      logSession,
      removeSession,
      addCustomBook,
      removeItem,
      refreshChildren,
      refreshLibrary,
    }),
    [
      loading,
      userId,
      userEmail,
      isStaff,
      aiEnabled,
      taxonomy,
      childList,
      activeChildId,
      setActiveChildId,
      library,
      customBooks,
      customItems,
      sessions,
      achievements,
      points,
      setStatus,
      toggleFavorite,
      setRating,
      logSession,
      removeSession,
      addCustomBook,
      removeItem,
      refreshChildren,
      refreshLibrary,
    ],
  )

  return <AppDataContext.Provider value={value}>{node}</AppDataContext.Provider>
}

export function useAppData(): AppData {
  const context = useContext(AppDataContext)
  if (!context) throw new Error('useAppData, AppDataProvider içinde kullanılmalı')
  return context
}
