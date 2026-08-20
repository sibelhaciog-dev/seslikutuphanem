import { describe, expect, it } from 'vitest'
import { matchesTerms, normalize, searchTerms } from './search'

describe('normalize', () => {
  it('Türkçe karakterleri sadeleştirir', () => {
    expect(normalize('Çaya Gelen Kaplan')).toBe('caya gelen kaplan')
    expect(normalize('İŞTE Oğuz')).toBe('iste oguz')
  })

  it('noktalama işaretlerini boşluğa çevirir', () => {
    expect(normalize("Tutkal Hanım'ın Kırık Kalpleri")).toBe('tutkal hanim in kirik kalpleri')
  })
})

describe('searchTerms', () => {
  it('tek harflik terimleri atar', () => {
    expect(searchTerms('bir e kitap')).toEqual(['bir', 'kitap'])
  })

  it('boş sorguda boş dizi döner', () => {
    expect(searchTerms('   !!!  ')).toEqual([])
  })
})

describe('matchesTerms', () => {
  it('önek eşleşmesi yapar (Türkçe ekler)', () => {
    expect(matchesTerms('Kardeşiyle paylaşmayı öğrendi', searchTerms('kardes'))).toBe(true)
    expect(matchesTerms('Kardeşlik üzerine', searchTerms('kardes'))).toBe(true)
    expect(matchesTerms('Paylaşmayı öğreniyorum', searchTerms('paylas'))).toBe(true)
  })

  it('kelime ortasındaki eşleşmeyi saymaz', () => {
    expect(matchesTerms('Bahçedeki ağaç', searchTerms('agac'))).toBe(true)
    expect(matchesTerms('Bahçedeki ağaç', searchTerms('hce'))).toBe(false)
  })

  it('tüm terimlerin bulunmasını ister', () => {
    expect(matchesTerms('Kaplan çaya geldi', searchTerms('kaplan cay'))).toBe(true)
    expect(matchesTerms('Kaplan çaya geldi', searchTerms('kaplan uzay'))).toBe(false)
  })

  it('terim yoksa her metni eşleştirir', () => {
    expect(matchesTerms('herhangi bir metin', [])).toBe(true)
  })
})
