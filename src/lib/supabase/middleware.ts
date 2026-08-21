import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { publicEnv } from '@/lib/env'
import type { Database } from './database.types'

/** Giriş yapılmadan açılamayacak sayfalar. */
const PROTECTED_PREFIXES = [
  '/kesif',
  '/kutuphanem',
  '/onboarding',
  '/profil',
  '/rapor',
  '/takvim',
  '/takas',
  '/bagis',
  '/yonetim',
]

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    publicEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          response = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const needsAuth = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))

  if (!user && needsAuth) {
    const url = request.nextUrl.clone()
    url.pathname = '/giris'
    url.searchParams.set('devam', pathname)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/giris' || pathname === '/kayit')) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return response
}
