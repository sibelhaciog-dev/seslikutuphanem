import type { Metadata } from 'next'
import { LibraryView } from '@/components/library/LibraryView'
import { getCatalog } from '@/lib/data/catalog'

export const metadata: Metadata = {
  title: 'Kitaplığım',
  robots: { index: false, follow: false },
}

export default async function LibraryPage() {
  const books = await getCatalog()
  return <LibraryView books={books} />
}
