import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type {
  AchievementView,
  Child,
  CustomBook,
  LibraryItem,
  ReadingNote,
  ReadingSession,
} from './types'

type Client = SupabaseClient<Database>

/**
 * Kütüphane okuma/yazma işlemleri.
 *
 * Hepsi tarayıcı istemcisiyle, kullanıcının kendi yetkisiyle (RLS) çalışır;
 * ayrı bir API katmanı yok. Sorgular tek yerde toplansın diye bu dosyada.
 */

// ─── Çocuklar ────────────────────────────────────────────────────────────────

export async function loadChildren(supabase: Client): Promise<Child[]> {
  const { data, error } = await supabase
    .from('children')
    // Tek parça dize olmalı: TypeScript birleştirilmiş dizeleri literal tip
    // olarak görmüyor, o zaman supabase-js iç içe seçimin tipini çıkaramıyor.
    .select(
      'id, name, birth_date, gender, avatar_character, avatar_accessories, position, child_interests(interests(slug)), child_focus_topics(development_topics(slug))',
    )
    .is('archived_at', null)
    .order('position')
    .order('created_at')

  if (error) throw error

  return (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    birthDate: row.birth_date,
    gender: row.gender,
    avatarCharacter: row.avatar_character,
    avatarAccessories: row.avatar_accessories ?? [],
    position: row.position,
    interestSlugs: (row.child_interests ?? [])
      .map((entry) => entry.interests?.slug)
      .filter((slug): slug is string => Boolean(slug)),
    focusTopicSlugs: (row.child_focus_topics ?? [])
      .map((entry) => entry.development_topics?.slug)
      .filter((slug): slug is string => Boolean(slug)),
  }))
}

// ─── Kütüphane kayıtları ─────────────────────────────────────────────────────

function toLibraryItem(row: Database['public']['Tables']['library_items']['Row']): LibraryItem {
  return {
    id: row.id,
    childId: row.child_id,
    bookId: row.book_id,
    customBookId: row.custom_book_id,
    status: row.status,
    isFavorite: row.is_favorite,
    rating: row.rating,
    timesRead: row.times_read,
    firstReadAt: row.first_read_at,
    lastReadAt: row.last_read_at,
  }
}

export async function loadLibraryItems(supabase: Client, childId: string): Promise<LibraryItem[]> {
  const { data, error } = await supabase.from('library_items').select('*').eq('child_id', childId)
  if (error) throw error
  return (data ?? []).map(toLibraryItem)
}

export interface LibraryPatch {
  status?: LibraryItem['status']
  isFavorite?: boolean
  rating?: number
}

/**
 * Kaydı oluşturur veya günceller.
 *
 * `book_id` üzerinde benzersiz indeks olduğu için tek sorguda upsert
 * yapılabiliyor; iki adımlı "önce oku, sonra yaz" yarışına gerek yok.
 */
export async function upsertLibraryItem(
  supabase: Client,
  input: {
    childId: string
    bookId?: string
    customBookId?: string
    addedFrom?: 'catalog' | 'camera' | 'manual'
    patch: LibraryPatch
  },
): Promise<LibraryItem> {
  const payload = {
    child_id: input.childId,
    book_id: input.bookId ?? null,
    custom_book_id: input.customBookId ?? null,
    added_from: input.addedFrom ?? 'catalog',
    ...(input.patch.status !== undefined ? { status: input.patch.status } : {}),
    ...(input.patch.isFavorite !== undefined ? { is_favorite: input.patch.isFavorite } : {}),
    ...(input.patch.rating !== undefined ? { rating: input.patch.rating } : {}),
  }

  const conflictTarget = input.bookId ? 'child_id,book_id' : 'child_id,custom_book_id'
  const { data, error } = await supabase
    .from('library_items')
    .upsert(payload, { onConflict: conflictTarget })
    .select()
    .single()

  if (error) throw error
  return toLibraryItem(data)
}

export async function deleteLibraryItem(supabase: Client, itemId: string): Promise<void> {
  const { error } = await supabase.from('library_items').delete().eq('id', itemId)
  if (error) throw error
}

// ─── Okuma oturumları ────────────────────────────────────────────────────────

function toSession(row: Database['public']['Tables']['reading_sessions']['Row']): ReadingSession {
  return {
    id: row.id,
    libraryItemId: row.library_item_id,
    readOn: row.read_on,
    minutes: row.minutes,
    mood: row.mood,
    note: row.note,
  }
}

export async function loadSessions(supabase: Client, childId: string): Promise<ReadingSession[]> {
  const { data, error } = await supabase
    .from('reading_sessions')
    .select('*, library_items!inner(child_id)')
    .eq('library_items.child_id', childId)
    .order('read_on', { ascending: false })
    .limit(1000)

  if (error) throw error
  return (data ?? []).map((row) => toSession(row))
}

export async function logReadingSession(
  supabase: Client,
  input: {
    libraryItemId: string
    readOn?: string
    minutes?: number
    mood?: ReadingSession['mood']
  },
): Promise<ReadingSession> {
  const { data, error } = await supabase
    .from('reading_sessions')
    .insert({
      library_item_id: input.libraryItemId,
      ...(input.readOn ? { read_on: input.readOn } : {}),
      ...(input.minutes ? { minutes: input.minutes } : {}),
      ...(input.mood ? { mood: input.mood } : {}),
    })
    .select()
    .single()

  if (error) throw error
  return toSession(data)
}

export async function deleteReadingSession(supabase: Client, sessionId: string): Promise<void> {
  const { error } = await supabase.from('reading_sessions').delete().eq('id', sessionId)
  if (error) throw error
}

/** Başarım değerlendirmesini tetikler; yeni kazanılan başarım sayısını döner. */
export async function evaluateAchievements(supabase: Client, childId: string): Promise<number> {
  const { data, error } = await supabase.rpc('evaluate_child_achievements', {
    target_child_id: childId,
  })
  if (error) return 0
  return data ?? 0
}

// ─── Notlar ──────────────────────────────────────────────────────────────────

export async function loadNotes(supabase: Client, libraryItemId: string): Promise<ReadingNote[]> {
  const { data, error } = await supabase
    .from('reading_notes')
    .select('*')
    .eq('library_item_id', libraryItemId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    libraryItemId: row.library_item_id,
    body: row.body,
    visibility: row.visibility,
    createdAt: row.created_at,
  }))
}

export async function addNote(
  supabase: Client,
  input: { libraryItemId: string; body: string; visibility: ReadingNote['visibility'] },
): Promise<ReadingNote> {
  const { data, error } = await supabase
    .from('reading_notes')
    .insert({
      library_item_id: input.libraryItemId,
      body: input.body,
      visibility: input.visibility,
    })
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id,
    libraryItemId: data.library_item_id,
    body: data.body,
    visibility: data.visibility,
    createdAt: data.created_at,
  }
}

export async function deleteNote(supabase: Client, noteId: string): Promise<void> {
  const { error } = await supabase.from('reading_notes').delete().eq('id', noteId)
  if (error) throw error
}

// ─── Kullanıcının kendi kitapları ────────────────────────────────────────────

export async function createCustomBook(
  supabase: Client,
  input: {
    ownerId: string
    title: string
    authorName?: string | null
    summary?: string | null
    origin: 'camera' | 'manual'
  },
): Promise<CustomBook> {
  const { data, error } = await supabase
    .from('custom_books')
    .insert({
      owner_id: input.ownerId,
      title: input.title,
      author_name: input.authorName ?? null,
      summary: input.summary ?? null,
      origin: input.origin,
    })
    .select()
    .single()

  if (error) throw error
  return {
    id: data.id,
    title: data.title,
    authorName: data.author_name,
    summary: data.summary,
    coverUrl: null,
    origin: data.origin,
  }
}

export async function loadCustomBooks(supabase: Client): Promise<CustomBook[]> {
  const { data, error } = await supabase
    .from('custom_books')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    authorName: row.author_name,
    summary: row.summary,
    coverUrl: row.cover_path,
    origin: row.origin,
  }))
}

// ─── Başarımlar ──────────────────────────────────────────────────────────────

export async function loadAchievements(
  supabase: Client,
  childId: string,
): Promise<AchievementView[]> {
  const [{ data: catalog }, { data: earned }] = await Promise.all([
    supabase.from('achievements').select('*').order('position'),
    supabase.from('child_achievements').select('achievement_id, earned_at').eq('child_id', childId),
  ])

  const earnedById = new Map((earned ?? []).map((row) => [row.achievement_id, row.earned_at]))

  return (catalog ?? []).map((row) => ({
    slug: row.slug,
    name: row.name,
    description: row.description,
    emoji: row.emoji,
    points: row.points,
    position: row.position,
    earnedAt: earnedById.get(row.id) ?? null,
  }))
}

export async function loadChildPoints(supabase: Client, childId: string): Promise<number> {
  const { data, error } = await supabase.rpc('child_points', { target_child_id: childId })
  if (error) return 0
  return data ?? 0
}

/** Birden çok çocuğun puanını tek seferde yükler (profil listesi için). */
export async function loadPointsByChild(
  supabase: Client,
  childIds: string[],
): Promise<Record<string, number>> {
  const results = await Promise.all(
    childIds.map(async (childId) => [childId, await loadChildPoints(supabase, childId)] as const),
  )
  return Object.fromEntries(results)
}
