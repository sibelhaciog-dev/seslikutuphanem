import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminOverviewPage() {
  const supabase = await createClient()

  // `children` doğrudan sayılamaz: RLS sahiple sınırlı, personel istisnası
  // bilinçli olarak yok (bkz. 0018). Sayıyı satır döndürmeyen bir fonksiyon
  // veriyor — yönetici kaç profil olduğunu görür, kimin olduğunu görmez.
  const [books, drafts, feedback, listings, stats] = await Promise.all([
    supabase.from('books').select('id', { count: 'exact', head: true }).eq('status', 'published'),
    supabase.from('books').select('id', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('feedback').select('id', { count: 'exact', head: true }).eq('status', 'new'),
    supabase
      .from('exchange_listings')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'active'),
    supabase.rpc('platform_stats'),
  ])

  const platform = (stats.data ?? {}) as {
    children?: number
    parents?: number
  }

  const cards = [
    { label: 'Yayındaki kitap', value: books.count ?? 0, href: '/yonetim/kitaplar' },
    { label: 'Taslak kitap', value: drafts.count ?? 0, href: '/yonetim/kitaplar?durum=draft' },
    { label: 'Yeni görüş', value: feedback.count ?? 0, href: '/yonetim/gorusler' },
    { label: 'Aktif takas ilanı', value: listings.count ?? 0, href: '/takas' },
    { label: 'Çocuk profili', value: platform.children ?? 0, href: '/yonetim' },
    { label: 'Kayıtlı ebeveyn', value: platform.parents ?? 0, href: '/yonetim' },
  ]

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-panel border border-line bg-white p-4 transition-colors hover:border-accent"
          >
            <p className="font-serif text-3xl text-accent">{card.value}</p>
            <p className="mt-1 text-xs text-muted">{card.label}</p>
          </Link>
        ))}
      </div>

      <section className="mt-6 rounded-panel border border-line bg-white p-5">
        <h2 className="mb-2 text-sm font-bold text-ink">İçerik nasıl güncellenir?</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Kitaplar depodaki <code className="rounded bg-cream px-1">content/books.json</code>{' '}
          dosyasından gelir ve <code className="rounded bg-cream px-1">npm run db:sync</code> ile
          buraya aktarılır. Buradan yapılan düzenlemeler doğrudan veritabanına yazılır; kalıcı
          olması için içerik dosyasına da işlenmelidir.
        </p>
      </section>
    </div>
  )
}
