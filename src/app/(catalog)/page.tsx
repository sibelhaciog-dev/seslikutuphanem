import { CatalogView } from '@/components/books/CatalogView'
import { getCatalog } from '@/lib/data/catalog'
import { loadDiscoveryModes } from '@/lib/data/discovery'
import { createPublicClient } from '@/lib/supabase/public'

export default async function HomePage() {
  // Modlar herkese açık (aktif olanlar); oturumsuz istemci yeterli ve
  // katalogla birlikte önbelleğe alınabiliyor.
  const [books, modes] = await Promise.all([
    getCatalog(),
    loadDiscoveryModes(createPublicClient()),
  ])
  return <CatalogView books={books} modes={modes} />
}
