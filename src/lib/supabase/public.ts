import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/**
 * Oturumsuz (çerezsiz) Supabase istemcisi.
 *
 * Katalog ve taksonomi herkese açık veriler; bunları oturum çerezine bağlı
 * olmayan bir istemciyle okuyoruz ki sonuçlar önbelleklenebilsin. RLS yine
 * geçerli: anonim kullanıcı yalnızca yayındaki kayıtları görür.
 */
let cached: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function createPublicClient() {
  cached ??= createSupabaseClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  return cached
}
