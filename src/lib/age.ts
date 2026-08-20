/** Yaş hesapları ve kitabın yaşa uygunluğu. */

export interface AgeRange {
  ageMin: number | null
  ageMax: number | null
}

/** Doğum tarihinden bugünkü yaşı hesaplar. */
export function ageFromBirthDate(birthDate: string, today = new Date()): number {
  const birth = new Date(`${birthDate}T00:00:00`)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age -= 1
  return Math.max(0, age)
}

export function ageOf(child: { birthDate: string | null }, today = new Date()): number | null {
  return child.birthDate ? ageFromBirthDate(child.birthDate, today) : null
}

/**
 * Kitabın çocuğun yaşına uygun olup olmadığı.
 *
 * v1'de yaş grupları metindi ("4+", "0-6") ve eşleştirme tahminliydi. Artık
 * sayısal aralık var; aralık dışı kalan kitaplar gösterilmez. Üst sınırda bir
 * yıl tolerans var: 6-8 yaş bir kitap 9 yaşındaki için hâlâ görünür.
 */
export const UPPER_AGE_TOLERANCE = 1

export function suitsAge(book: AgeRange, childAge: number | null): boolean {
  if (childAge === null) return true
  if (book.ageMin === null && book.ageMax === null) return true
  if (book.ageMin !== null && childAge < book.ageMin) return false
  if (book.ageMax !== null && childAge > book.ageMax + UPPER_AGE_TOLERANCE) return false
  return true
}

/** Filtre çipleri için yaş kümeleri. */
export const AGE_BANDS = [
  { slug: 'bebek', label: '0–2 yaş', min: 0, max: 2 },
  { slug: 'okul-oncesi', label: '3–5 yaş', min: 3, max: 5 },
  { slug: 'ilkokul', label: '6–8 yaş', min: 6, max: 8 },
  { slug: 'ortaokul', label: '9+ yaş', min: 9, max: 18 },
] as const

export type AgeBandSlug = (typeof AGE_BANDS)[number]['slug']

/** Kitabın yaş aralığı seçilen kuşakla kesişiyor mu? */
export function inAgeBand(book: AgeRange, band: AgeBandSlug): boolean {
  const range = AGE_BANDS.find((item) => item.slug === band)
  if (!range) return true
  const min = book.ageMin ?? 0
  const max = book.ageMax ?? 18
  return min <= range.max && max >= range.min
}
