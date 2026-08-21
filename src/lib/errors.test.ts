import { describe, expect, it } from 'vitest'
import { toFriendlyError, toFriendlyMessage } from './errors'

const FALLBACK = 'Kaydedilemedi. Tekrar deneyin.'

/** Supabase'in PostgrestError biçimini taklit eder. */
function pgError(message: string, code = '23514') {
  return { message, code, details: '', hint: '' }
}

describe('toFriendlyError — veritabanı kısıtları', () => {
  it('doğum tarihi kısıtını Türkçeye çevirir ve alanı işaretler', () => {
    const error = pgError(
      'new row for relation "children" violates check constraint "children_birth_date_check"',
    )
    expect(toFriendlyError(error, FALLBACK)).toEqual({
      field: 'birthDate',
      message: 'Doğum tarihi bugünden ileri olamaz.',
    })
  })

  it('bağış adresi kısıtını çevirir', () => {
    const error = pgError(
      'new row for relation "donation_requests" violates check constraint "donation_requests_address_check"',
    )
    const result = toFriendlyError(error, FALLBACK)
    expect(result.field).toBe('address')
    expect(result.message).toContain('en az 5')
  })

  it('takas iletişim adı kısıtını çevirir', () => {
    const error = pgError(
      'new row for relation "exchange_listings" violates check constraint "exchange_listings_contact_name_check"',
    )
    expect(toFriendlyError(error, FALLBACK).field).toBe('contactName')
  })

  it('yönetim arayüzündeki yaş kısıtını çevirir', () => {
    const error = pgError(
      'new row for relation "books" violates check constraint "books_age_max_check"',
    )
    expect(toFriendlyError(error, FALLBACK)).toEqual({
      field: 'ageMax',
      message: 'Yaş 0 ile 18 arasında olmalı.',
    })
  })

  it('benzersizlik hatasını çevirir (farklı mesaj biçimi)', () => {
    const error = pgError(
      'duplicate key value violates unique constraint "books_slug_key"',
      '23505',
    )
    expect(toFriendlyError(error, FALLBACK).field).toBe('slug')
  })

  it('kısıt adı ayrı alanda gelirse onu kullanır', () => {
    const error = { message: 'bilinmeyen', code: '23514', constraint: 'children_name_check' }
    expect(toFriendlyError(error, FALLBACK).field).toBe('name')
  })

  it('tanımadığı kısıtta koda göre genel mesaj verir', () => {
    const error = pgError(
      'new row for relation "x" violates check constraint "x_bilinmeyen_check"',
    )
    const result = toFriendlyError(error, FALLBACK)
    expect(result.message).toBe('Girdiğiniz bilgilerden biri kabul edilmedi. Alanları kontrol edin.')
    expect(result.field).toBeUndefined()
  })

  it('RLS reddini yetki mesajına çevirir', () => {
    expect(toFriendlyMessage(pgError('permission denied', '42501'), FALLBACK)).toBe(
      'Bu işlem için yetkiniz yok.',
    )
  })
})

describe('toFriendlyError — kimlik doğrulama', () => {
  const cases: Array<[string, string]> = [
    ['Invalid login credentials', 'E-posta veya şifre hatalı.'],
    ['missing email or phone', 'E-posta adresinizi yazın.'],
    ['Anonymous sign-ins are disabled', 'E-posta adresinizi yazın.'],
    ['Unable to validate email address: invalid format', 'E-posta adresi geçerli görünmüyor.'],
    ['New password should be different from the old password.', 'Yeni şifre eskisiyle aynı olamaz.'],
  ]

  it.each(cases)('%s → Türkçe', (raw, expected) => {
    expect(toFriendlyMessage({ message: raw }, FALLBACK)).toBe(expected)
  })

  it('zaten kayıtlı e-postayı alanıyla birlikte döndürür', () => {
    const result = toFriendlyError({ message: 'User already registered' }, FALLBACK)
    expect(result.field).toBe('email')
    expect(result.message).toContain('zaten var')
  })

  it('hız sınırını anlaşılır hale getirir', () => {
    expect(toFriendlyMessage({ message: 'Email rate limit exceeded' }, FALLBACK)).toContain(
      'Çok fazla deneme',
    )
  })

  it('süresi dolmuş bağlantıyı açıklar', () => {
    expect(toFriendlyMessage({ message: 'JWT expired' }, FALLBACK)).toContain('süresi dolmuş')
  })
})

describe('toFriendlyError — genel davranış', () => {
  it('ağ hatasını bağlantı sorunu olarak açıklar', () => {
    expect(toFriendlyMessage(new TypeError('Failed to fetch'), FALLBACK)).toContain(
      'İnternet bağlantısı',
    )
  })

  it('boş hatada yedek metni verir', () => {
    expect(toFriendlyMessage(null, FALLBACK)).toBe(FALLBACK)
    expect(toFriendlyMessage(undefined, FALLBACK)).toBe(FALLBACK)
  })

  it('tanımadığı hatada yedek metni verir — ham metni ASLA sızdırmaz', () => {
    const raw = 'something went terribly wrong in english'
    expect(toFriendlyMessage(new Error(raw), FALLBACK)).toBe(FALLBACK)
  })

  // Asıl amaç bu: kullanıcı hiçbir koşulda İngilizce/teknik metin görmemeli.
  it('bilinen hiçbir çeviri İngilizce veritabanı jargonu içermez', () => {
    const samples = [
      'new row for relation "children" violates check constraint "children_birth_date_check"',
      'duplicate key value violates unique constraint "books_slug_key"',
      'Invalid login credentials',
      'permission denied for table children',
    ]
    for (const raw of samples) {
      const message = toFriendlyMessage({ message: raw, code: '23514' }, FALLBACK)
      expect(message).not.toMatch(/violates|constraint|relation|permission denied|invalid login/i)
    }
  })
})
