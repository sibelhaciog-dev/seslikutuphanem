/**
 * Form doğrulama kuralları — veritabanı kısıtlarının aynası.
 *
 * NEDEN VAR: Formlar veritabanının reddedeceği veriyi göndermeye izin
 * veriyordu. Kullanıcı "Kaydedilemedi. Tekrar deneyin." görüp aynı veriyi
 * tekrar tekrar gönderiyordu; onboarding sihirbazında atlama seçeneği de
 * olmadığı için tamamen sıkışıyordu.
 *
 * KURAL: Buradaki her sınır `supabase/migrations/` içindeki bir CHECK
 * kısıtıyla eşleşir. Kısıtı değiştirirsen burayı da değiştir — aksi halde
 * ya kullanıcı boşuna engellenir ya da hata yine veritabanından döner.
 * Hata yine de dönerse `src/lib/errors.ts` onu Türkçeye çevirir; bu dosya
 * ilk savunma hattı, tek savunma değil.
 */

/** Veritabanı kısıtlarından türetilen sınırlar. */
export const LIMITS = {
  childName: { min: 1, max: 40 }, // children_name_check
  /**
   * children_birth_date_check ile aynı üst sınır (bugün).
   * Alt sınır ürün kararı: 18 yaşından büyük "çocuk" profili açılmasın.
   * Veritabanı kısıtı bilerek daha gevşek (30 yıl) — böylece yıllar
   * geçtikçe eski bir satırın güncellenmesi kısıta takılmıyor.
   */
  childAgeYears: { max: 18 },
  displayName: { min: 1, max: 80 }, // profiles_display_name_check
  feedbackMessage: { min: 1, max: 4000 }, // feedback_message_check
  donationFullName: { min: 2, max: 120 }, // donation_requests_full_name_check
  donationAddress: { min: 5, max: 500 }, // donation_requests_address_check
  donationCount: { min: 1, max: 10000 }, // donation_requests_approximate_count_check
  exchangeContactName: { min: 2, max: 80 }, // exchange_listings_contact_name_check
  exchangeTitle: { min: 1, max: 200 }, // exchange_listings_title_check
  exchangeOffer: { min: 0, max: 300 }, // exchange_listings_offer_check
  bookTitle: { min: 1, max: 200 }, // books_title_check
  bookAge: { min: 0, max: 18 }, // books_age_min_check / books_age_max_check
  readingNote: { min: 1, max: 2000 }, // reading_notes_body_check
  password: { min: 8 }, // Supabase Auth ayarı
} as const

/**
 * Yerel saate göre `YYYY-MM-DD`.
 *
 * `toISOString()` KULLANMAYIN: o UTC'ye çevirir ve Türkiye UTC+3 olduğu için
 * gece yarısı ile 03:00 arasında "bugün"ü dünmüş gibi gösterir. Sonuç:
 * kullanıcı bugünün tarihini giriyor, form "ileri tarih" diye reddediyor.
 */
export function todayISO(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Bugünden `years` yıl önceki tarih, `YYYY-MM-DD`. */
export function yearsAgoISO(years: number, date = new Date()): string {
  const shifted = new Date(date.getFullYear() - years, date.getMonth(), date.getDate())
  return todayISO(shifted)
}

/** Çocuk profili için kabul edilen en erken doğum tarihi. */
export function earliestBirthDate(now = new Date()): string {
  return yearsAgoISO(LIMITS.childAgeYears.max, now)
}

/**
 * Doğum tarihini doğrular. Geçerliyse `undefined`, değilse Türkçe mesaj döner.
 * Boş değer "zorunlu alan" olarak ayrı ele alınır.
 */
export function validateBirthDate(value: string, now = new Date()): string | undefined {
  if (!value) return 'Doğum tarihini girin.'

  // `YYYY-MM-DD` dışındaki her şey (tarayıcı tipik olarak buna zorlar).
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Doğum tarihi geçerli görünmüyor.'

  const parsed = new Date(`${value}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return 'Doğum tarihi geçerli görünmüyor.'

  if (value > todayISO(now)) return 'Doğum tarihi bugünden ileri olamaz.'
  if (value < earliestBirthDate(now)) {
    return `Çocuk profili en fazla ${LIMITS.childAgeYears.max} yaşına kadar açılabilir.`
  }

  return undefined
}

/**
 * Kırpılmış metin uzunluğunu doğrular — veritabanı kısıtları da
 * `char_length(trim(...))` kullanıyor, bu yüzden aynı şekilde kırpıyoruz.
 */
export function validateText(
  value: string,
  { min, max }: { min: number; max: number },
  label: string,
): string | undefined {
  const trimmed = value.trim()

  if (min > 0 && trimmed.length === 0) return `${label} boş bırakılamaz.`
  if (trimmed.length < min) return `${label} en az ${min} karakter olmalı.`
  if (trimmed.length > max) return `${label} en fazla ${max} karakter olabilir.`

  return undefined
}

/** Sayısal alanları doğrular. */
export function validateNumber(
  value: number | null | undefined,
  { min, max }: { min: number; max: number },
  label: string,
): string | undefined {
  if (value === null || value === undefined || Number.isNaN(value)) return undefined
  if (!Number.isFinite(value)) return `${label} geçerli bir sayı olmalı.`
  if (value < min || value > max) return `${label} ${min} ile ${max} arasında olmalı.`
  return undefined
}

/**
 * E-posta için kasıtlı olarak gevşek bir kontrol: amaç yazım hatasını
 * yakalamak, RFC 5322 uygulamak değil. Kesin karar sunucunun.
 */
export function validateEmail(value: string): string | undefined {
  const trimmed = value.trim()
  if (!trimmed) return 'E-posta adresinizi yazın.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'E-posta adresi geçerli görünmüyor.'
  return undefined
}

export function validatePassword(value: string): string | undefined {
  if (!value) return 'Şifrenizi yazın.'
  if (value.length < LIMITS.password.min) {
    return `Şifre en az ${LIMITS.password.min} karakter olmalı.`
  }
  return undefined
}
