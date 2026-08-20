import type { Metadata } from 'next'
import { ReadingCalendar } from '@/components/reports/ReadingCalendar'
import { getCatalog } from '@/lib/data/catalog'

export const metadata: Metadata = {
  title: 'Okuma takvimi',
  robots: { index: false, follow: false },
}

export default async function CalendarPage() {
  const books = await getCatalog()
  return <ReadingCalendar books={books} />
}
