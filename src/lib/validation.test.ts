import { describe, expect, it } from 'vitest'
import {
  earliestBirthDate,
  todayISO,
  validateBirthDate,
  validateEmail,
  validateNumber,
  validatePassword,
  validateText,
  yearsAgoISO,
} from './validation'

describe('todayISO', () => {
  it('yerel tarihi verir', () => {
    expect(todayISO(new Date(2026, 7, 21, 14, 0))).toBe('2026-08-21')
  })

  // Asıl hata buydu: toISOString() UTC'ye çeviriyordu. Türkiye UTC+3 olduğu
  // için gece 01:00'de "bugün" bir gün geri kayıyor ve kullanıcının girdiği
  // bugünün tarihi "ileri tarih" sayılıp reddediliyordu.
  it('gece yarısından hemen sonra bir gün geri kaymaz', () => {
    const gece = new Date(2026, 7, 21, 1, 0) // 21 Ağustos 01:00 yerel
    expect(todayISO(gece)).toBe('2026-08-21')
    expect(gece.toISOString().slice(0, 10)).toBe('2026-08-20') // UTC'de dün
  })

  it('ay ve günü sıfırla doldurur', () => {
    expect(todayISO(new Date(2026, 0, 5))).toBe('2026-01-05')
  })
})

describe('yearsAgoISO / earliestBirthDate', () => {
  it('yılı geriye alır', () => {
    expect(yearsAgoISO(18, new Date(2026, 7, 21))).toBe('2008-08-21')
  })

  it('en erken doğum tarihi 18 yıl öncesi', () => {
    expect(earliestBirthDate(new Date(2026, 7, 21))).toBe('2008-08-21')
  })
})

describe('validateBirthDate', () => {
  const now = new Date(2026, 7, 21) // 21 Ağustos 2026

  it('makul bir tarihi kabul eder', () => {
    expect(validateBirthDate('2019-05-10', now)).toBeUndefined()
  })

  it('bugünü kabul eder (yeni doğan)', () => {
    expect(validateBirthDate('2026-08-21', now)).toBeUndefined()
  })

  it('boş değeri zorunlu alan olarak bildirir', () => {
    expect(validateBirthDate('', now)).toBe('Doğum tarihini girin.')
  })

  it('ileri tarihi reddeder', () => {
    expect(validateBirthDate('2030-05-10', now)).toBe('Doğum tarihi bugünden ileri olamaz.')
  })

  it('yarını bile reddeder', () => {
    expect(validateBirthDate('2026-08-22', now)).toBe('Doğum tarihi bugünden ileri olamaz.')
  })

  // Mehmet'in canlıda karşılaştığı durum: 2000 öncesi bir tarih girilince
  // veritabanı ham Postgres hatası döndürüyordu.
  it('18 yaşından büyüğü reddeder ve sebebini söyler', () => {
    const message = validateBirthDate('1990-05-10', now)
    expect(message).toContain('18 yaş')
  })

  it('tam 18 yıl öncesini kabul eder (sınır dahil)', () => {
    expect(validateBirthDate('2008-08-21', now)).toBeUndefined()
  })

  it('18 yıl bir günden fazlasını reddeder', () => {
    expect(validateBirthDate('2008-08-20', now)).toContain('18 yaş')
  })

  it('bozuk biçimi reddeder', () => {
    expect(validateBirthDate('10/05/2019', now)).toBe('Doğum tarihi geçerli görünmüyor.')
    expect(validateBirthDate('abc', now)).toBe('Doğum tarihi geçerli görünmüyor.')
  })

  it('hiçbir mesaj İngilizce/teknik değil', () => {
    for (const value of ['', '2030-01-01', '1990-01-01', 'abc']) {
      const message = validateBirthDate(value, now)
      expect(message).toBeDefined()
      expect(message).not.toMatch(/constraint|violates|invalid date|check/i)
    }
  })
})

describe('validateText', () => {
  const rule = { min: 2, max: 5 }

  it('geçerli metni kabul eder', () => {
    expect(validateText('abc', rule, 'Ad')).toBeUndefined()
  })

  it('boş metni bildirir', () => {
    expect(validateText('', rule, 'Ad')).toBe('Ad boş bırakılamaz.')
  })

  // Veritabanı da trim'liyor: yalnızca boşluktan oluşan değer geçmemeli.
  it('yalnızca boşluk içeren metni boş sayar', () => {
    expect(validateText('   ', rule, 'Ad')).toBe('Ad boş bırakılamaz.')
  })

  it('kısa metni bildirir', () => {
    expect(validateText('a', rule, 'Ad')).toBe('Ad en az 2 karakter olmalı.')
  })

  it('uzun metni bildirir', () => {
    expect(validateText('abcdef', rule, 'Ad')).toBe('Ad en fazla 5 karakter olabilir.')
  })

  it('uzunluğu kırpılmış haliyle ölçer', () => {
    expect(validateText('  abcde  ', rule, 'Ad')).toBeUndefined()
  })

  it('Türkçe karakterleri tek karakter sayar', () => {
    expect(validateText('çğı', { min: 3, max: 3 }, 'Ad')).toBeUndefined()
  })
})

describe('validateNumber', () => {
  const rule = { min: 0, max: 18 }

  it('aralıktaki sayıyı kabul eder', () => {
    expect(validateNumber(5, rule, 'Yaş')).toBeUndefined()
    expect(validateNumber(0, rule, 'Yaş')).toBeUndefined()
    expect(validateNumber(18, rule, 'Yaş')).toBeUndefined()
  })

  it('aralık dışını bildirir', () => {
    expect(validateNumber(19, rule, 'Yaş')).toBe('Yaş 0 ile 18 arasında olmalı.')
    expect(validateNumber(-1, rule, 'Yaş')).toBe('Yaş 0 ile 18 arasında olmalı.')
  })

  // Boş sayısal alan "belirtilmemiş" demek; zorunluluk ayrı ele alınır.
  it('boş değeri hata saymaz', () => {
    expect(validateNumber(null, rule, 'Yaş')).toBeUndefined()
    expect(validateNumber(undefined, rule, 'Yaş')).toBeUndefined()
    expect(validateNumber(Number.NaN, rule, 'Yaş')).toBeUndefined()
  })
})

describe('validateEmail / validatePassword', () => {
  it('geçerli e-postayı kabul eder', () => {
    expect(validateEmail('anne@ornek.com')).toBeUndefined()
  })

  it('bozuk e-postayı reddeder', () => {
    for (const value of ['abc', 'a@b', 'a b@c.com', '@ornek.com']) {
      expect(validateEmail(value)).toBe('E-posta adresi geçerli görünmüyor.')
    }
  })

  it('boş e-postayı ayrı bildirir', () => {
    expect(validateEmail('  ')).toBe('E-posta adresinizi yazın.')
  })

  it('kısa şifreyi reddeder', () => {
    expect(validatePassword('1234567')).toBe('Şifre en az 8 karakter olmalı.')
    expect(validatePassword('12345678')).toBeUndefined()
  })
})
