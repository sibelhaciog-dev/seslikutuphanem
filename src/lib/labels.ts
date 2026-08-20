import type {
  ContributorRole,
  Gender,
  Language,
  LibraryStatus,
  NoteVisibility,
  ReadingMood,
} from './data/types'

/**
 * Veritabanındaki İngilizce enum değerlerinin Türkçe karşılıkları (ADR 0005).
 * Kullanıcıya görünen her metin buradan geçer.
 */

export const LIBRARY_STATUS_LABELS: Record<LibraryStatus, string> = {
  to_read: 'Okunacak',
  reading: 'Okunuyor',
  read: 'Okundu',
  abandoned: 'Yarım bırakıldı',
}

export const LIBRARY_STATUS_EMOJI: Record<LibraryStatus, string> = {
  to_read: '🔖',
  reading: '📖',
  read: '✓',
  abandoned: '⏸️',
}

export const NOTE_VISIBILITY_LABELS: Record<NoteVisibility, string> = {
  private: '🔒 Sadece bana',
  family: '👨‍👩‍👧 Aile içi',
  public: '🌍 Herkese açık',
}

export const GENDER_LABELS: Record<Gender, string> = {
  girl: '👧 Kız',
  boy: '👦 Erkek',
  unspecified: '🧒 Belirtmek istemiyorum',
}

export const MOOD_LABELS: Record<ReadingMood, string> = {
  loved: '😍 Bayıldı',
  liked: '🙂 Sevdi',
  ok: '😐 İdare eder',
  disliked: '🙁 Sevmedi',
}

export const CONTRIBUTOR_ROLE_LABELS: Record<ContributorRole, string> = {
  author: 'Yazar',
  illustrator: 'Çizer',
  translator: 'Çevirmen',
  editor: 'Editör',
}

export const LANGUAGE_LABELS: Record<Language, string> = {
  tr: '🇹🇷 Türkçe',
  en: '🇬🇧 İngilizce',
}

export const FEEDBACK_TOPIC_LABELS: Record<string, string> = {
  feature: '💡 Özellik önerisi',
  bug: '🐛 Hata / sorun',
  book: '📖 Kitap önerisi',
  general: '🌟 Genel görüş',
}

export const BOOK_CONDITION_LABELS: Record<string, string> = {
  new: 'Sıfır gibi',
  good: 'İyi durumda',
  worn: 'Yıpranmış',
}

/** "4–8 yaş", "3+ yaş" gibi okunabilir yaş etiketi. */
export function ageLabel(ageMin: number | null, ageMax: number | null): string | null {
  if (ageMin === null && ageMax === null) return null
  if (ageMin !== null && ageMax !== null) {
    return ageMin === ageMax ? `${ageMin} yaş` : `${ageMin}–${ageMax} yaş`
  }
  if (ageMin !== null) return `${ageMin}+ yaş`
  return `${ageMax} yaşa kadar`
}
