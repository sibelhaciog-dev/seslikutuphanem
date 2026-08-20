import { CatalogView } from '@/components/books/CatalogView'
import { getCatalog } from '@/lib/data/catalog'

export default async function HomePage() {
  const books = await getCatalog()
  return <CatalogView books={books} />
}
