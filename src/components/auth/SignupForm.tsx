'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { createClient } from '@/lib/supabase/client'

const MIN_PASSWORD_LENGTH = 8

export function SignupForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
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
    const { data, error: signUpError } = await createClient().auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/onboarding`,
      },
    })
    setBusy(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    // E-posta doğrulaması açıksa oturum hemen açılmaz.
    if (data.session) {
      // Bkz. LoginForm: oturum çerezi yazıldıktan sonra tam gezinme.
      window.location.assign('/onboarding')
      return
    }
    router.push(`/auth/dogrula?email=${encodeURIComponent(email.trim())}`)
  }

  return (
    <AuthCard
      title="Kayıt ol"
      description="Çocuklarının okuma yolculuğunu takip etmeye başla."
      footer={
        <>
          Zaten hesabın var mı?{' '}
          <Link href="/giris" className="font-semibold text-accent">
            Giriş yap
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <FormMessage tone="error">{error}</FormMessage>
        <TextField
          label="Ad soyad"
          autoComplete="name"
          required
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Adınız"
        />
        <TextField
          label="E-posta"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ornek@mail.com"
        />
        <TextField
          label="Şifre"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          hint={`En az ${MIN_PASSWORD_LENGTH} karakter`}
        />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? 'Kayıt olunuyor…' : 'Kayıt ol →'}
        </Button>
      </form>
    </AuthCard>
  )
}
