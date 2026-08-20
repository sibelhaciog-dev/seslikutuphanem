import type { Metadata } from 'next'
import { ProfileManager } from '@/components/children/ProfileManager'

export const metadata: Metadata = {
  title: 'Profiller',
  robots: { index: false, follow: false },
}

export default function ProfilePage() {
  return <ProfileManager />
}
