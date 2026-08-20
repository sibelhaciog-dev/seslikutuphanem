import type { Metadata } from 'next'
import { Suspense } from 'react'
import { VerifyNotice } from '@/components/auth/VerifyNotice'

export const metadata: Metadata = {
  title: 'E-postanı doğrula',
  robots: { index: false, follow: false },
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyNotice />
    </Suspense>
  )
}
