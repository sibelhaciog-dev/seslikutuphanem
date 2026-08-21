/**
 * Supabase, Postgres ve GoTrue hatalarını kullanıcıya gösterilebilir Türkçe
 * metne çevirir.
 *
 * NEDEN VAR: Formlar hatayı ya olduğu gibi basıyordu — kullanıcı
 * `new row for relation "children" violates check constraint
 * "children_birth_date_check"` gibi bir cümle görüyordu — ya da her şeyi
 * "Tekrar deneyin."e indirgiyordu; o da neyin yanlış olduğunu söylemiyor.
 * İkisi de kullanıcıyı çıkmaza sokuyor.
 *
 * KURAL: Kullanıcıya gösterilen hiçbir metin İngilizce olmamalı ve hiçbir
 * veritabanı iç adı sızmamalı. Tanımadığımız bir hata gelirse çağıran
 * tarafın verdiği yedek metni kullanırız.
 *
 * `field` dolu dönerse hata ilgili form alanının altında gösterilebilir;
 * boşsa formun tepesindeki genel uyarıya düşer.
 */

export interface FriendlyError {
  /** Kullanıcıya gösterilecek Türkçe metin. */
  message: string
  /** Hatanın ait olduğu form alanı (varsa). */
  field?: string
}

/**
 * Veritabanı kısıtı → anlaşılır mesaj.
 *
 * Anahtarlar `supabase/migrations/` içindeki kısıt adlarıyla birebir aynı.
 * Yeni bir kısıt eklerken buraya da bir satır ekleyin; `npm run db:test`
 * kısıtların varlığını doğruluyor ama mesajın Türkçe olduğunu bu tablo
 * garanti ediyor.
 */
const CONSTRAINT_MESSAGES: Record<string, FriendlyError> = {
  // ─── Çocuk profili ───────────────────────────────────────────────────────
  children_birth_date_check: {
    field: 'birthDate',
    message: 'Doğum tarihi bugünden ileri olamaz.',
  },
  children_name_check: {
    field: 'name',
    message: 'Çocuğun adı en az 1, en fazla 40 karakter olmalı.',
  },

  // ─── Ebeveyn profili ─────────────────────────────────────────────────────
  profiles_display_name_check: {
    field: 'displayName',
    message: 'Adınız en fazla 80 karakter olabilir.',
  },

  // ─── Kütüphane ve okuma ──────────────────────────────────────────────────
  library_items_rating_check: { field: 'rating', message: 'Puan 0 ile 5 arasında olmalı.' },
  reading_sessions_read_on_check: {
    field: 'readOn',
    message: 'Okuma tarihi bugünden ileri olamaz.',
  },
  reading_sessions_minutes_check: {
    field: 'minutes',
    message: 'Okuma süresi 1 ile 600 dakika arasında olmalı.',
  },
  reading_sessions_note_check: { field: 'note', message: 'Not en fazla 500 karakter olabilir.' },
  reading_notes_body_check: {
    field: 'body',
    message: 'Not en az 1, en fazla 2000 karakter olmalı.',
  },
  custom_books_title_check: {
    field: 'title',
    message: 'Kitap adı en az 1, en fazla 200 karakter olmalı.',
  },

  // ─── Topluluk ────────────────────────────────────────────────────────────
  feedback_message_check: {
    field: 'message',
    message: 'Mesaj en az 1, en fazla 4000 karakter olmalı.',
  },
  donation_requests_full_name_check: {
    field: 'fullName',
    message: 'Ad soyad en az 2, en fazla 120 karakter olmalı.',
  },
  donation_requests_address_check: {
    field: 'address',
    message: 'Adres en az 5, en fazla 500 karakter olmalı.',
  },
  donation_requests_approximate_count_check: {
    field: 'approximateCount',
    message: 'Kitap sayısı 1 ile 10000 arasında olmalı.',
  },
  exchange_listings_contact_name_check: {
    field: 'contactName',
    message: 'İletişim adı en az 2, en fazla 80 karakter olmalı.',
  },
  exchange_listings_title_check: {
    field: 'title',
    message: 'İlan başlığı en az 1, en fazla 200 karakter olmalı.',
  },
  exchange_listings_offer_check: {
    field: 'offer',
    message: 'Takas notu en fazla 300 karakter olabilir.',
  },
  exchange_listings_age_min_check: { field: 'ageMin', message: 'Yaş 0 ile 18 arasında olmalı.' },
  exchange_listings_age_max_check: { field: 'ageMax', message: 'Yaş 0 ile 18 arasında olmalı.' },

  // ─── Katalog (yönetim arayüzü) ───────────────────────────────────────────
  books_title_check: { field: 'title', message: 'Kitap adı en az 1, en fazla 200 karakter olmalı.' },
  books_age_min_check: { field: 'ageMin', message: 'Yaş 0 ile 18 arasında olmalı.' },
  books_age_max_check: { field: 'ageMax', message: 'Yaş 0 ile 18 arasında olmalı.' },
  books_age_range: {
    field: 'ageMax',
    message: 'Üst yaş sınırı alt sınırdan küçük olamaz.',
  },
  books_page_count_check: { field: 'pageCount', message: 'Sayfa sayısı 0’dan büyük olmalı.' },
  books_published_year_check: {
    field: 'publishedYear',
    message: 'Basım yılı 1800 ile 2100 arasında olmalı.',
  },
  books_isbn13_check: { field: 'isbn13', message: 'ISBN 13 haneli bir sayı olmalı.' },
  books_slug_check: {
    field: 'slug',
    message: 'Adres yalnızca küçük harf, rakam ve tire içerebilir.',
  },
  books_like_count_check: { field: 'likeCount', message: 'Beğeni sayısı negatif olamaz.' },

  // ─── Benzersizlik ────────────────────────────────────────────────────────
  books_slug_key: { field: 'slug', message: 'Bu adres başka bir kitapta kullanılıyor.' },
  books_isbn13_key: { field: 'isbn13', message: 'Bu ISBN başka bir kitapta kayıtlı.' },
  books_instagram_shortcode_key: {
    field: 'instagramUrl',
    message: 'Bu Instagram gönderisi başka bir kitaba bağlı.',
  },
}

/**
 * GoTrue (kimlik doğrulama) mesajları. Sunucu bunları İngilizce döndürüyor;
 * eşleştirme parça içerme ile yapılıyor çünkü metinler sürümle değişebiliyor.
 */
const AUTH_MESSAGES: Array<[RegExp, FriendlyError]> = [
  [/invalid login credentials/i, { message: 'E-posta veya şifre hatalı.' }],
  [
    /email not confirmed/i,
    { message: 'Önce e-posta adresinizi doğrulayın. Gelen kutunuza gönderdiğimiz bağlantıya bakın.' },
  ],
  [
    /user already registered|already been registered/i,
    { field: 'email', message: 'Bu e-posta ile bir hesap zaten var. Giriş yapmayı deneyin.' },
  ],
  [
    /unable to validate email address|invalid format/i,
    { field: 'email', message: 'E-posta adresi geçerli görünmüyor.' },
  ],
  [
    /missing email or phone|anonymous sign-ins are disabled/i,
    { field: 'email', message: 'E-posta adresinizi yazın.' },
  ],
  [
    /password should be at least (\d+)/i,
    { field: 'password', message: 'Şifre en az 8 karakter olmalı.' },
  ],
  [
    /new password should be different/i,
    { field: 'password', message: 'Yeni şifre eskisiyle aynı olamaz.' },
  ],
  [
    /password.*(weak|compromised|leaked|pwned)/i,
    { field: 'password', message: 'Bu şifre çok yaygın kullanılıyor. Daha güçlü bir şifre seçin.' },
  ],
  [
    /rate limit|only request this after|too many requests/i,
    { message: 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar deneyin.' },
  ],
  [
    /token has expired|jwt expired|invalid.*token|otp.*expired/i,
    { message: 'Bağlantının süresi dolmuş. Yeni bir bağlantı isteyin.' },
  ],
  [/email address.*invalid|invalid email/i, { field: 'email', message: 'E-posta adresi geçerli görünmüyor.' }],
  [/signups not allowed|signup is disabled/i, { message: 'Şu anda yeni kayıt alınmıyor.' }],
  [
    /database error saving new user/i,
    { message: 'Hesap oluşturulurken bir sorun çıktı. Birkaç dakika sonra tekrar deneyin.' },
  ],
]

/** Postgres hata kodu → genel mesaj (kısıt adından eşleşme çıkmazsa). */
const CODE_MESSAGES: Record<string, string> = {
  '23514': 'Girdiğiniz bilgilerden biri kabul edilmedi. Alanları kontrol edin.',
  '23505': 'Bu kayıt zaten var.',
  '23503': 'İlişkili kayıt bulunamadı.',
  '23502': 'Zorunlu bir alan boş bırakılmış.',
  '22001': 'Girdiğiniz metin çok uzun.',
  '42501': 'Bu işlem için yetkiniz yok.',
  PGRST301: 'Oturumunuzun süresi dolmuş. Yeniden giriş yapın.',
}

/** Hata nesnesinden metin çıkarır; biçimi bilinmeyen değerlerde boş döner. */
function readMessage(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object' && 'message' in error) {
    const value = (error as { message: unknown }).message
    if (typeof value === 'string') return value
  }
  return ''
}

function readCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const value = (error as { code: unknown }).code
    if (typeof value === 'string') return value
    if (typeof value === 'number') return String(value)
  }
  return ''
}

/**
 * Postgres kısıt adını hata metninden çıkarır.
 *
 * Örnek: `new row for relation "children" violates check constraint
 * "children_birth_date_check"` → `children_birth_date_check`
 * Benzersizlik hatalarında biçim farklı: `duplicate key value violates
 * unique constraint "books_slug_key"`.
 */
function readConstraintName(error: unknown): string {
  if (error && typeof error === 'object') {
    // PostgrestError bazı sürümlerde kısıt adını ayrı alanda taşıyor.
    for (const key of ['constraint', 'constraint_name']) {
      if (key in error) {
        const value = (error as Record<string, unknown>)[key]
        if (typeof value === 'string' && value) return value
      }
    }
  }

  const haystack = `${readMessage(error)} ${
    error && typeof error === 'object' && 'details' in error
      ? String((error as { details: unknown }).details ?? '')
      : ''
  }`

  return haystack.match(/constraint "([^"]+)"/)?.[1] ?? ''
}

/** Ağ kopması gibi durumlar: sunucudan hiç yanıt gelmemiş demektir. */
function isNetworkError(error: unknown): boolean {
  const message = readMessage(error)
  return /failed to fetch|networkerror|network request failed|load failed/i.test(message)
}

/**
 * Herhangi bir hatayı kullanıcıya gösterilebilir hale getirir.
 *
 * @param fallback Tanımadığımız hatalarda gösterilecek Türkçe metin.
 *                 Çağıran taraf bağlama uygun bir cümle vermeli
 *                 ("Profil kaydedilemedi." gibi).
 */
export function toFriendlyError(error: unknown, fallback: string): FriendlyError {
  if (!error) return { message: fallback }

  if (isNetworkError(error)) {
    return { message: 'İnternet bağlantısı kurulamadı. Bağlantınızı kontrol edip tekrar deneyin.' }
  }

  const constraint = readConstraintName(error)
  if (constraint && CONSTRAINT_MESSAGES[constraint]) return CONSTRAINT_MESSAGES[constraint]

  const message = readMessage(error)
  for (const [pattern, friendly] of AUTH_MESSAGES) {
    if (pattern.test(message)) return friendly
  }

  const code = readCode(error)
  if (code && CODE_MESSAGES[code]) return { message: CODE_MESSAGES[code] }

  return { message: fallback }
}

/** Yalnızca metin gerektiğinde kısayol. */
export function toFriendlyMessage(error: unknown, fallback: string): string {
  return toFriendlyError(error, fallback).message
}
