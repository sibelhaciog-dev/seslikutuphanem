import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getViewer } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Yönetim',
  robots: { index: false, follow: false },
}

const TABS = [
  { href: '/yonetim', label: 'Genel bakış' },
  { href: '/yonetim/kitaplar', label: 'Kitaplar' },
  { href: '/yonetim/gorusler', label: 'Görüşler' },
]

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isStaff } = await getViewer()
  // Middleware giriş kontrolünü yapıyor; burada da yetki kontrolü var ki
  // rolü olmayan bir kullanıcı adresi elle yazarak giremesin.
  if (!user) redirect('/giris?devam=/yonetim')
  if (!isStaff) redirect('/')

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl">🛠️ Yönetim</h1>
        <p className="mt-1 text-sm text-muted">İçerik ve geri bildirim yönetimi</p>
      </header>

      <nav className="mb-6 flex gap-2 border-b border-line">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="border-b-2 border-transparent px-3 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:border-accent hover:text-accent"
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  )
}
