'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { AvatarFigure } from '@/components/avatar/AvatarFigure'
import { useAppData } from '@/components/providers/AppDataProvider'
import { InstagramIcon } from '@/components/layout/InstagramIcon'
import { cn } from '@/lib/cn'
import { createClient } from '@/lib/supabase/client'
import { INSTAGRAM_URL } from '@/lib/site'

const MENU_ITEMS: { href: string; label: string; external?: boolean }[] = [
  { href: '/kesif', label: '✨ Kitap keşfi' },
  { href: '/rapor', label: '📊 Okuma raporu' },
  { href: '/takvim', label: '📅 Okuma takvimi' },
  { href: '/takas', label: '🔄 Kitap takası' },
  { href: '/bagis', label: '📚 Kitap bağışı' },
  { href: '/gorus', label: '💬 Görüş bildir' },
  { href: INSTAGRAM_URL, label: '📸 Instagram', external: true },
]

export function SiteHeader() {
  const { isAuthenticated, isStaff, userEmail, children, activeChildId, setActiveChildId } =
    useAppData()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!menuOpen) return
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  async function signOut() {
    await createClient().auth.signOut()
    // Tam sayfa yenileme: kullanıcı zaten ana sayfadaysa `push` bir şey
    // yapmaz ve oturum çerezi temizlendiği hâlde sunucudan gelen başlık eski
    // kalırdı. Çıkış nadir bir işlem, tam yenileme en güvenilir yol.
    window.location.assign('/')
  }

  return (
    <header className="border-b border-line bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 md:h-[68px] md:flex-row md:items-center md:justify-between md:gap-4 md:py-0">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span
              className="flex size-9 items-center justify-center rounded-[9px] bg-accent text-lg"
              aria-hidden
            >
              📚
            </span>
            <span>
              <span className="block font-serif text-[17px] leading-none text-ink">
                Sesli Kütüphanem
              </span>
              <span className="hidden text-[11px] text-muted md:block">Çocuk kitap rehberi</span>
            </span>
          </Link>
          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="hidden items-center gap-1.5 rounded-full border-[1.5px] border-line px-3.5 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent md:inline-flex"
          >
            <InstagramIcon className="size-3.5" />
            Instagram
          </a>
        </div>

        <nav className="grid grid-cols-3 gap-1.5 md:flex md:items-center md:gap-3">
          <HeaderLink href="/kutuphanem">📚 Kitaplığım</HeaderLink>
          <HeaderLink href={isAuthenticated ? '/profil' : '/giris'}>
            {isAuthenticated ? '👤 Profiller' : '👤 Giriş'}
          </HeaderLink>

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((open) => !open)}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="w-full rounded-full border-[1.5px] border-line px-3 py-2 text-[13px] font-medium text-ink-soft transition-colors hover:border-accent hover:text-accent"
            >
              ☰ Menü
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+8px)] z-50 min-w-56 overflow-hidden rounded-2xl border-[1.5px] border-line bg-white shadow-lift"
              >
                {MENU_ITEMS.map((item) =>
                  item.external ? (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noreferrer noopener"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream"
                    >
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream"
                    >
                      {item.label}
                    </Link>
                  ),
                )}
                {isStaff && (
                  <>
                    <div className="mx-4 my-1 h-px bg-line" />
                    <Link
                      href="/yonetim"
                      role="menuitem"
                      className="block px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-cream"
                    >
                      🛠️ Yönetim
                    </Link>
                  </>
                )}
                {isAuthenticated && (
                  <>
                    <div className="mx-4 my-1 h-px bg-line" />
                    <p className="truncate px-4 py-1 text-[11px] text-muted">{userEmail}</p>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={signOut}
                      className="block w-full px-4 py-2.5 text-left text-sm font-medium text-danger transition-colors hover:bg-danger-soft"
                    >
                      🚪 Çıkış yap
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </nav>
      </div>

      {children.length > 0 && (
        <div className="border-t border-line">
          <div className="scrollbar-none mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-2">
            {children.map((child) => {
              const active = child.id === activeChildId
              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => setActiveChildId(child.id)}
                  aria-pressed={active}
                  className={cn(
                    'flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors',
                    active
                      ? 'bg-accent text-white'
                      : 'text-muted hover:bg-accent-soft hover:text-accent',
                  )}
                >
                  <AvatarFigure
                    characterId={child.avatarCharacter}
                    headOnly
                    size={22}
                    className="shrink-0"
                  />
                  {child.name}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </header>
  )
}

function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname()
  const active = pathname === href
  return (
    <Link
      href={href}
      className={cn(
        'rounded-full border-[1.5px] px-3 py-2 text-center text-[13px] font-medium transition-colors',
        active
          ? 'border-accent bg-accent-soft text-accent'
          : 'border-line text-ink-soft hover:border-accent hover:text-accent',
      )}
    >
      {children}
    </Link>
  )
}
