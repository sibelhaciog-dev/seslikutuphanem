import type { Metadata } from 'next'
import { OnboardingWizard } from '@/components/children/OnboardingWizard'

export const metadata: Metadata = {
  title: 'Hoş geldiniz',
  robots: { index: false, follow: false },
}

export default function OnboardingPage() {
  return <OnboardingWizard />
}
