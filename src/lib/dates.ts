/**
 * Tarih biçimlendirme — sunucu ve tarayıcıda AYNI sonucu verir.
 *
 * NEDEN VAR: `toLocaleDateString('tr-TR')` bölge belirtilmezse çalıştığı
 * ortamın saat dilimini kullanır. Next.js ilk HTML'i sunucuda üretiyor
 * (orası UTC), tarayıcı ise yeniden render ediyor (orası Türkiye saati).
 * İkisi farklı metin üretince React hidrasyon uyuşmazlığı veriyor
 * (minified error #418) ve konsola hata düşüyor.
 *
 * Gece yarısı ile 03:00 arasında gün bile kayabiliyor: UTC'de hâlâ dün.
 *
 * Ürün tek bölgeye kurulu (bkz. `docs/prd.md` §8) ve `profiles.timezone`
 * varsayılanı da bu; sabit bölge vermek hem doğru hem deterministik.
 */

const TIME_ZONE = 'Europe/Istanbul'
const LOCALE = 'tr-TR'

/** `21 Ağustos` */
export function formatDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  })
}

/** `21.08.2026` — dar alanlar için */
export function formatShortDate(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE, { timeZone: TIME_ZONE })
}

/** `21 Ağustos 14:18` */
export function formatDateTime(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE, {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: TIME_ZONE,
  })
}

/** `Ağustos 2026` */
export function formatMonth(value: string | Date): string {
  return new Date(value).toLocaleDateString(LOCALE, {
    month: 'long',
    year: 'numeric',
    timeZone: TIME_ZONE,
  })
}

/**
 * `Cuma, 21 Ağustos` — takvimde seçili gün.
 *
 * Girdi `YYYY-MM-DD` ise öğlen kabul edilir: gün sınırında kaymasın.
 */
export function formatWeekday(value: string): string {
  const stamp = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value
  return new Date(stamp).toLocaleDateString(LOCALE, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: TIME_ZONE,
  })
}
