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

export function siteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`
  return 'http://localhost:3000'
}
