import type { Metadata } from 'next'
import { ReadingReport } from '@/components/reports/ReadingReport'
import { getCatalog } from '@/lib/data/catalog'

export const metadata: Metadata = {
  title: 'Okuma raporu',
  robots: { index: false, follow: false },
}

export default async function ReportPage() {
  const books = await getCatalog()
  return <ReadingReport books={books} />
}
