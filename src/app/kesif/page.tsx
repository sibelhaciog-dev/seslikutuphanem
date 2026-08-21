import type { Metadata } from 'next'
import { DiscoveryPage } from '@/components/discovery/DiscoveryPage'
import { loadDiscoveryModes, loadRecommendationHistory } from '@/lib/data/discovery'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Kitap keşfi',
  description: 'Çocuğunuzun o anki ihtiyacına göre kitap önerisi alın.',
}

// Oturuma bağlı sayfalara `revalidate` verilmiyor: Next.js sayfayı yerleşimle
// birlikte önbelleğe alıyor ve giriş yapmış kullanıcı anonim kabuğu görüyor.
export const dynamic = 'force-dynamic'

export default async function KesifPage() {
  const supabase = await createClient()
  const [modes, history] = await Promise.all([
    loadDiscoveryModes(supabase),
    loadRecommendationHistory(supabase),
  ])

  return <DiscoveryPage modes={modes} initialHistory={history} />
}
