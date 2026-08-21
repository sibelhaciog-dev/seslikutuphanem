'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { toFriendlyError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/client'
import { validateEmail } from '@/lib/validation'

/** `auth/callback` doğrulama başarısız olunca buraya `?hata=` ile yönlendiriyor. */
const CALLBACK_ERRORS: Record<string, string> = {
  dogrulama:
    'Doğrulama bağlantısı çalışmadı. Bağlantının süresi dolmuş olabilir; yeni bir tane isteyin.',
}

export function LoginForm() {
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(CALLBACK_ERRORS[searchParams.get('hata') ?? ''] ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    // Sunucuya gitmeden önce bariz eksikleri yakala: aksi halde Supabase
    // `missing email or phone` gibi İngilizce bir metin döndürüyor.
    const found: Record<string, string> = {}
    const emailError = validateEmail(email)
    if (emailError) found.email = emailError
    const passwordError = password ? undefined : 'Şifrenizi yazın.'
    if (passwordError) found.password = passwordError

    if (Object.keys(found).length > 0) {
      setFieldErrors(found)
      return
    }

    setBusy(true)
    const { error: signInError } = await createClient().auth.signInWithPassword({
      email: email.trim(),
      password,
    })
    setBusy(false)

    if (signInError) {
      const friendly = toFriendlyError(signInError, 'Giriş yapılamadı. Tekrar deneyin.')
      // Kimlik bilgisi hataları bilerek alana bağlanmıyor: hangi alanın
      // yanlış olduğunu söylemek hesap var mı yok mu bilgisini sızdırır.
      if (friendly.field && friendly.field !== 'email') {
        setFieldErrors({ [friendly.field]: friendly.message })
      } else {
        setError(friendly.message)
      }
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
          error={fieldErrors.email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="ornek@mail.com"
        />
        <TextField
          label="Şifre"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          error={fieldErrors.password}
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
