'use client'

import { useState, type FormEvent } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { toFriendlyError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/client'
import { validateEmail } from '@/lib/validation'

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setFieldError('')

    const emailError = validateEmail(email)
    if (emailError) {
      setFieldError(emailError)
      return
    }

    setBusy(true)

    const { error: resetError } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/sifre-yenile`,
    })
    setBusy(false)

    if (resetError) {
      const friendly = toFriendlyError(resetError, 'Bağlantı gönderilemedi. Tekrar deneyin.')
      if (friendly.field === 'email') setFieldError(friendly.message)
      else setError(friendly.message)
      return
    }
    setMessage('Şifre sıfırlama bağlantısı e-postana gönderildi.')
  }

  return (
    <AuthCard title="Şifremi unuttum" description="E-posta adresini gir, bağlantı gönderelim.">
      <form onSubmit={submit} noValidate>
        <FormMessage tone="error">{error}</FormMessage>
        <FormMessage tone="success">{message}</FormMessage>
        <TextField
          label="E-posta"
          type="email"
          autoComplete="email"
          required
          value={email}
          error={fieldError}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ornek@mail.com"
        />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? 'Gönderiliyor…' : 'Bağlantı gönder'}
        </Button>
      </form>
    </AuthCard>
  )
}
