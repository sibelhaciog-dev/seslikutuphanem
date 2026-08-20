'use client'

import { createBrowserClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null

/** Tarayıcı tarafı Supabase istemcisi (tek örnek). */
export function createClient() {
  cached ??= createBrowserClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  )
  return cached
}
