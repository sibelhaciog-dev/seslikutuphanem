/**
 * İstemci tarafı arama.
 *
 * Veritabanındaki `build_search_query` ile aynı mantığı uygular: aksanları
 * sadeleştir, kelimelere böl, her kelimeyi ÖNEK olarak eşleştir. Türkçe eklemeli
 * bir dil olduğu için önek eşleştirmesi gövdelemeden çok daha iyi sonuç verir
 * ("kardes" → "kardeşim", "kardeşlik", "kardeşinin").
 *
 * Ana sayfada katalog zaten istemcide olduğu için arama sunucuya gitmez;
 * veritabanı araması yönetim ekranında ve katalog büyüdüğünde kullanılır.
 */

const TURKISH_MAP: Record<string, string> = {
  ç: 'c',
  ğ: 'g',
  ı: 'i',
  i: 'i',
  ö: 'o',
  ş: 's',
  ü: 'u',
  â: 'a',
  î: 'i',
  û: 'u',
}

export function normalize(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıiöşüâîû]/g, (char) => TURKISH_MAP[char] ?? char)
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

export function searchTerms(query: string): string[] {
  return normalize(query)
    .split(' ')
    .filter((term) => term.length >= 2)
}

/**
 * Tüm terimler metinde önek olarak geçiyorsa eşleşme var demektir.
 * (Veritabanındaki `term:* & term:*` sorgusunun karşılığı.)
 */
export function matchesTerms(haystack: string, terms: string[]): boolean {
  if (terms.length === 0) return true
  const words = normalize(haystack).split(' ')
  return terms.every((term) => words.some((word) => word.startsWith(term)))
}
