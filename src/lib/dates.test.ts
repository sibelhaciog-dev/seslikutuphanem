import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatMonth, formatShortDate, formatWeekday } from './dates'

describe('tarih biçimlendirme', () => {
  it('gün ve ayı Türkçe verir', () => {
    expect(formatDate('2026-08-21T09:00:00Z')).toBe('21 Ağustos')
  })

  it('kısa biçim gün.ay.yıl', () => {
    expect(formatShortDate('2026-08-21T09:00:00Z')).toBe('21.08.2026')
  })

  it('saat de ister', () => {
    // 09:00 UTC = 12:00 İstanbul
    expect(formatDateTime('2026-08-21T09:00:00Z')).toContain('21 Ağustos')
    expect(formatDateTime('2026-08-21T09:00:00Z')).toContain('12:00')
  })

  it('ay ve yıl', () => {
    expect(formatMonth('2026-08-21T09:00:00Z')).toBe('Ağustos 2026')
  })

  it('haftanın gününü verir', () => {
    // Türkçe'de gün adı tarihten SONRA gelir.
    expect(formatWeekday('2026-08-21')).toBe('21 Ağustos Cuma')
  })
})

// Asıl mesele bu: sunucu (UTC) ile tarayıcı (Türkiye) aynı metni üretmeli,
// yoksa React hidrasyon uyuşmazlığı veriyor (#418).
describe('saat dilimi kararlılığı', () => {
  // 22 Ağustos 00:30 İstanbul = 21 Ağustos 21:30 UTC — gün farklı.
  const geceYarisi = '2026-08-21T21:30:00Z'

  it('gece yarısından sonra gün kaymaz', () => {
    expect(formatDate(geceYarisi)).toBe('22 Ağustos')
    expect(formatShortDate(geceYarisi)).toBe('22.08.2026')
  })

  it('bölge belirtmeyen biçimlendirme kayabilirdi', () => {
    // Bu testin çalıştığı ortam UTC ise fark görünür; değilse zaten aynı.
    // Amaç, sabit bölge vermenin gerekliliğini belgelemek.
    const bolgesiz = new Date(geceYarisi).toLocaleDateString('tr-TR')
    const bolgeli = formatShortDate(geceYarisi)
    expect(bolgeli).toBe('22.08.2026')
    expect(typeof bolgesiz).toBe('string')
  })

  it('YYYY-MM-DD girdisi gün sınırında kaymaz', () => {
    // Öğlen kabul ediliyor; UTC'ye çevrilince hâlâ aynı gün.
    expect(formatWeekday('2026-01-01')).toContain('1 Ocak')
    expect(formatWeekday('2026-12-31')).toContain('31 Aralık')
  })
})
