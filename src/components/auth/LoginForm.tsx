'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { createClient } from '@/lib/supabase/client'

const FRIENDLY_ERRORS: Record<string, string> = {
  'Invalid login credentials': 'E-posta veya şifre hatalı.',
  'Email not confirmed': 'Önce e-postandaki doğrulama bağlantısına tıklaman gerekiyor.',
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)

    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)

    if (signInError) {
      setError(FRIENDLY_ERRORS[signInError.message] ?? signInError.message)
      return
    }

    // Oturum değişimlerinde tam sayfa gezinme kullanıyoruz.
    // `router.push` ile istemci tarafı gezinme, oturum çerezi tarayıcıya
    // yazılmadan önce başlayabiliyor; middleware oturumu göremeyip kullanıcıyı
    // giriş sayfasına geri atıyordu.
    window.location.assign(searchParams.get('devam') ?? '/')
  }

  return (
    <AuthCard
      title="Giriş yap"
      description="Çocuklarının okuma kaydına devam et."
      footer={
        <>
          Hesabın yok mu?{' '}
          <Link href="/kayit" className="font-semibold text-accent">
            Kayıt ol
          </Link>
        </>
      }
    >
      <form onSubmit={submit} noValidate>
        <FormMessage tone="error">{error}</FormMessage>
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
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
        />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? 'Giriş yapılıyor…' : 'Giriş yap →'}
        </Button>
      </form>
      <p className="mt-4 text-center text-xs text-muted">
        Şifreni mi unuttun?{' '}
        <Link href="/sifremi-unuttum" className="font-semibold text-accent">
          Sıfırla
        </Link>
      </p>
    </AuthCard>
  )
}
