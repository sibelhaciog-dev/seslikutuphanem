'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { AuthCard } from '@/components/auth/AuthCard'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { toFriendlyError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/client'
import { LIMITS, validateEmail, validatePassword, validateText } from '@/lib/validation'

export function SignupForm() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setFieldErrors({})

    // `profiles.display_name` 80 karakterle sınırlı; daha uzun ad gönderilirse
    // kayıt tetikleyicisi düşüyor ve Supabase `Database error saving new user`
    // döndürüyordu — kullanıcı için hiçbir anlam ifade etmeyen bir metin.
    const found: Record<string, string> = {}
    const nameError = validateText(fullName, LIMITS.displayName, 'Ad soyad')
    if (nameError) found.fullName = nameError
    const emailError = validateEmail(email)
    if (emailError) found.email = emailError
    const passwordError = validatePassword(password)
    if (passwordError) found.password = passwordError

    if (Object.keys(found).length > 0) {
      setFieldErrors(found)
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
      const friendly = toFriendlyError(signUpError, 'Kayıt tamamlanamadı. Tekrar deneyin.')
      if (friendly.field) setFieldErrors({ [friendly.field]: friendly.message })
      else setError(friendly.message)
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
          maxLength={LIMITS.displayName.max}
          value={fullName}
          error={fieldErrors.fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder="Adınız"
        />
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
          autoComplete="new-password"
          required
          minLength={LIMITS.password.min}
          value={password}
          error={fieldErrors.password}
          onChange={(event) => setPassword(event.target.value)}
          hint={`En az ${LIMITS.password.min} karakter`}
        />
        <Button type="submit" size="lg" disabled={busy} className="w-full">
          {busy ? 'Kayıt olunuyor…' : 'Kayıt ol →'}
        </Button>
      </form>
    </AuthCard>
  )
}
