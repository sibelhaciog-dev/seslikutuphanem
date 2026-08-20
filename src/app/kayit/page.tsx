import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/SignupForm'

export const metadata: Metadata = {
  title: 'Kayıt ol',
  robots: { index: false, follow: false },
}

export default function SignupPage() {
  return <SignupForm />
}
