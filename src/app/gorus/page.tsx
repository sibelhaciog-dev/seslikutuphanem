import type { Metadata } from 'next'
import { FeedbackForm } from '@/components/community/FeedbackForm'

export const metadata: Metadata = {
  title: 'Görüş bildir',
  description: 'Sesli Kütüphanem hakkında görüş ve önerilerinizi paylaşın.',
}

export default function FeedbackPage() {
  return <FeedbackForm />
}
