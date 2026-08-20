import type { Metadata } from 'next'
import { BookExchange } from '@/components/community/BookExchange'

export const metadata: Metadata = {
  title: 'Kitap takası',
  description: 'Okunmuş çocuk kitaplarını başka ebeveynlerle takas edin.',
  robots: { index: false, follow: false },
}

export default function ExchangePage() {
  return <BookExchange />
}
