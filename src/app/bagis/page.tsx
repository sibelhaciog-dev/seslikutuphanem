import type { Metadata } from 'next'
import { DonationForm } from '@/components/community/DonationForm'
import { createPublicClient } from '@/lib/supabase/public'

export const metadata: Metadata = {
  title: 'Kitap bağışı',
  description: 'Okunmuş çocuk kitaplarınızı bağışlayın.',
  robots: { index: false, follow: false },
}

// Rota dinamik: yerleşim oturuma bağlı (bkz. kitap sayfasındaki not).

export default async function DonationPage() {
  const { data } = await createPublicClient()
    .from('donation_organizations')
    .select('id, name, description')
    .eq('is_active', true)
    .order('position')

  return <DonationForm organizations={data ?? []} />
}
