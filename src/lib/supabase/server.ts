import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/** Sunucu bileşenleri, route handler'lar ve server action'lar için istemci. */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Sunucu bileşeninden çağrıldığında çerez yazılamaz; oturum
            // yenilemesi middleware tarafından yapılıyor.
          }
        },
      },
    },
  )
}

export async function getSessionUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
}

/** Giriş yapan kullanıcı ve editör/yönetici yetkisi. */
export async function getViewer() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { user: null, isStaff: false }

  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id)

  const isStaff = (roles ?? []).some((row) => row.role === 'editor' || row.role === 'admin')
  return { user, isStaff }
}
