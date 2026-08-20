import { describe, expect, it } from 'vitest'
import { AGE_BANDS, ageFromBirthDate, inAgeBand, suitsAge } from './age'

describe('ageFromBirthDate', () => {
  it('doğum günü geçmişse tam yaşı verir', () => {
    expect(ageFromBirthDate('2020-01-15', new Date('2026-06-01'))).toBe(6)
  })

  it('doğum günü gelmemişse bir eksik sayar', () => {
    expect(ageFromBirthDate('2020-12-15', new Date('2026-06-01'))).toBe(5)
  })

  it('doğum gününde yaşı artırır', () => {
    expect(ageFromBirthDate('2020-06-01', new Date('2026-06-01'))).toBe(6)
  })

  it('gelecekteki tarih için sıfırın altına inmez', () => {
    expect(ageFromBirthDate('2030-01-01', new Date('2026-06-01'))).toBe(0)
  })
})

describe('suitsAge', () => {
  it('yaş bilinmiyorsa her kitabı gösterir', () => {
    expect(suitsAge({ ageMin: 7, ageMax: 12 }, null)).toBe(true)
  })

  it('kitabın yaş aralığı yoksa gösterir', () => {
    expect(suitsAge({ ageMin: null, ageMax: null }, 4)).toBe(true)
  })

  it('alt sınırın altındaki çocuğa göstermez', () => {
    expect(suitsAge({ ageMin: 7, ageMax: 12 }, 4)).toBe(false)
  })

  it('üst sınırda bir yıl tolerans tanır', () => {
    expect(suitsAge({ ageMin: 3, ageMax: 6 }, 7)).toBe(true)
    expect(suitsAge({ ageMin: 3, ageMax: 6 }, 8)).toBe(false)
  })

  it('aralık içindeki çocuğa gösterir', () => {
    expect(suitsAge({ ageMin: 4, ageMax: 8 }, 6)).toBe(true)
  })

  it('yalnızca alt sınır varsa üstünü sınırlamaz', () => {
    expect(suitsAge({ ageMin: 5, ageMax: null }, 12)).toBe(true)
  })
})

describe('inAgeBand', () => {
  it('kesişen aralığı kabul eder', () => {
    expect(inAgeBand({ ageMin: 4, ageMax: 8 }, 'okul-oncesi')).toBe(true)
    expect(inAgeBand({ ageMin: 4, ageMax: 8 }, 'ilkokul')).toBe(true)
  })

  it('kesişmeyen aralığı eler', () => {
    expect(inAgeBand({ ageMin: 9, ageMax: 12 }, 'bebek')).toBe(false)
  })

  it('yaş aralığı olmayan kitabı her kuşakta gösterir', () => {
    expect(inAgeBand({ ageMin: null, ageMax: null }, 'bebek')).toBe(true)
  })

  it('tüm kuşaklar 0-18 aralığını kapsar', () => {
    expect(AGE_BANDS[0]!.min).toBe(0)
    expect(AGE_BANDS.at(-1)!.max).toBe(18)
  })
})
