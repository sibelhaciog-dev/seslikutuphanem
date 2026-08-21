import { z } from 'zod'

/**
 * Ortam değişkenleri tek yerden okunur; eksik bir değer uygulamayı sessizce
 * bozmak yerine anlaşılır bir hata verir.
 *
 * Yapay zekâ ayarları için bkz. `src/lib/ai/config.ts` — orada eksik ayar
 * hataya değil, özelliğin kapanmasına yol açar.
 */

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url('NEXT_PUBLIC_SUPABASE_URL geçerli bir adres olmalı'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10, 'NEXT_PUBLIC_SUPABASE_ANON_KEY eksik'),
})

/**
 * Next.js istemci paketine yalnızca doğrudan `process.env.X` şeklinde yazılan
 * değişkenleri gömer, bu yüzden alanlar tek tek yazılıyor.
 */
export const publicEnv = publicEnvSchema.parse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
})

/**
 * Adresi kullanılabilir hale getirir; getiremiyorsa `null` döndürür.
 *
 * Şema eksikse tamamlanır. Sebebi: Vercel `VERCEL_URL`'i şemasız veriyor
 * (`site.vercel.app`) ve panele elle girilirken de sıklıkla şemasız
 * yazılıyor. Şemasız değer `new URL()` çağrısında patlıyor — bu da
 * `layout.tsx` içindeki `metadataBase` yüzünden tüm derlemeyi düşürüyor.
 * Yanlış yazılmış bir ortam değişkeni sitenin derlenmesini engellememeli.
 */
function normalizeSiteUrl(value: string | undefined): string | null {
  // Sondaki eğik çizgiyi burada KIRPMIYORUZ: "http://" değeri "http:" olur ve
  // şemasız sanılıp bir kez daha şema eklenirdi. `origin` zaten yolu ve
  // sondaki çizgiyi düşürüyor.
  const trimmed = value?.trim()
  if (!trimmed) return null

  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : // Yerel adresler TLS'siz çalışır; kalanlar için https varsayılır.
      `${/^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(trimmed) ? 'http' : 'https'}://${trimmed}`

  try {
    const parsed = new URL(withScheme)
    // Sunucuda (Node) `http://` zaten patlar, tarayıcı/jsdom ise onu boş
    // makine adıyla kabul eder. Kontrolü açıkça yapıyoruz ki ikisinde de aynı.
    return parsed.hostname ? parsed.origin : null
  } catch {
    return null
  }
}

export function siteUrl(): string {
  return (
    normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
    normalizeSiteUrl(process.env.VERCEL_URL) ??
    'http://localhost:3000'
  )
}
