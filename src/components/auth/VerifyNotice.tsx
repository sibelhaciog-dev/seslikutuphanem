'use client'

import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { FormMessage } from '@/components/ui/Field'
import { createClient } from '@/lib/supabase/client'

export function VerifyNotice() {
  const email = useSearchParams().get('email') ?? ''
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function check() {
    const {
      data: { session },
    } = await createClient().auth.getSession()
    if (session) {
      window.location.assign('/onboarding')
      return
    }
    setError('Henüz doğrulanmamış görünüyor. E-postanı kontrol et.')
  }

  async function resend() {
    if (!email) return
    const { error: resendError } = await createClient().auth.resend({ type: 'signup', email })
    if (resendError) {
      setError(resendError.message)
      return
    }
    setError('')
    setMessage('Doğrulama e-postası tekrar gönderildi.')
  }

  return (
    <AuthCard title="E-postanı doğrula">
      <div className="text-center">
        <p className="mb-6 text-sm leading-relaxed text-muted">
          <strong className="text-ink">{email}</strong> adresine bir doğrulama bağlantısı gönderdik.
          Bağlantıya tıkladıktan sonra buraya dön.
        </p>
        <FormMessage tone="error">{error}</FormMessage>
        <FormMessage tone="success">{message}</FormMessage>
        <Button size="lg" className="mb-3 w-full" onClick={() => void check()}>
          ✓ Doğruladım, devam et
        </Button>
        <button
          type="button"
          onClick={() => void resend()}
          className="text-xs font-semibold text-accent"
        >
          E-posta gelmedi mi? Tekrar gönder
        </button>
      </div>
    </AuthCard>
  )
}
