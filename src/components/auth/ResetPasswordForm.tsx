'use client'

import { useState, type FormEvent } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { toFriendlyError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/client'
import { LIMITS, validatePassword } from '@/lib/validation'

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setFieldError('')

    const passwordError = validatePassword(password)
    if (passwordError) {
      setFieldError(passwordError)
      return
    }

    setBusy(true)
    const { error: updateError } = await createClient().auth.updateUser({ password })
    setBusy(false)

    if (updateError) {
      const friendly = toFriendlyError(updateError, 'Şifre güncellenemedi. Tekrar deneyin.')
      if (friendly.field === 'password') setFieldError(friendly.message)
      else setError(friendly.message)
      return
    }
    window.location.assign('/')
  }

  return (
    <AuthCard title="Yeni şifre" description="Hesabın için yeni bir şifre belirle.">
      <form onSubmit={submit} noValidate>
        <FormMessage tone="error">{error}</FormMessage>
        <TextField
          label="Yeni şifre"
          type="password"
          autoComplete="new-password"
          required
          minLength={LIMITS.password.min}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={fieldError}
          hint={`En az ${LIMITS.password.min} karakter`}
        />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
        </Button>
      </form>
    </AuthCard>
  )
}
