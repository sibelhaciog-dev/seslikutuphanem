import { describe, expect, it } from 'vitest'
import { isValidTurkishPhone, toWhatsAppNumber } from './phone'

describe('toWhatsAppNumber', () => {
  it.each([
    ['0532 123 45 67', '905321234567'],
    ['5321234567', '905321234567'],
    ['+90 532 123 45 67', '905321234567'],
    ['0 (532) 123-45-67', '905321234567'],
  ])('%s → %s', (input, expected) => {
    expect(toWhatsAppNumber(input)).toBe(expected)
  })
})

describe('isValidTurkishPhone', () => {
  it('geçerli cep numaralarını kabul eder', () => {
    expect(isValidTurkishPhone('0532 123 45 67')).toBe(true)
    expect(isValidTurkishPhone('+905321234567')).toBe(true)
  })

  it('eksik veya hatalı numaraları reddeder', () => {
    expect(isValidTurkishPhone('123')).toBe(false)
    expect(isValidTurkishPhone('0212 123 45 67')).toBe(false)
  })
})
