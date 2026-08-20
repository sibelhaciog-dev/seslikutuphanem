'use client'

import { useState, type FormEvent } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { createClient } from '@/lib/supabase/client'

const MIN_PASSWORD_LENGTH = 8

export function ResetPasswordForm() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Şifre en az ${MIN_PASSWORD_LENGTH} karakter olmalı.`)
      return
    }

    setBusy(true)
    const { error: updateError } = await createClient().auth.updateUser({ password })
    setBusy(false)

    if (updateError) {
      setError(updateError.message)
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
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={`En az ${MIN_PASSWORD_LENGTH} karakter`}
        />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? 'Kaydediliyor…' : 'Şifreyi güncelle'}
        </Button>
      </form>
    </AuthCard>
  )
}
