'use client'

import { useState, type FormEvent } from 'react'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormMessage, SelectField, TextAreaField } from '@/components/ui/Field'
import { toFriendlyMessage } from '@/lib/errors'
import { createClient } from '@/lib/supabase/client'
import { LIMITS, validateText } from '@/lib/validation'

const TOPICS = [
  { value: 'feature', label: '💡 Özellik önerisi' },
  { value: 'bug', label: '🐛 Hata / sorun' },
  { value: 'book', label: '📖 Kitap önerisi' },
  { value: 'general', label: '🌟 Genel görüş' },
] as const

export function FeedbackForm() {
  const { userId, isAuthenticated } = useAppData()
  const [topic, setTopic] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!topic) {
      setError('Lütfen bir konu seçin.')
      return
    }
    const messageError = validateText(message, LIMITS.feedbackMessage, 'Mesaj')
    if (messageError) {
      setError(messageError)
      return
    }
    if (!userId) {
      setError('Görüş göndermek için giriş yapmanız gerekiyor.')
      return
    }

    setBusy(true)
    const { error: insertError } = await createClient()
      .from('feedback')
      .insert({
        user_id: userId,
        topic: topic as (typeof TOPICS)[number]['value'],
        message: message.trim(),
      })
    setBusy(false)

    if (insertError) {
      setError(toFriendlyMessage(insertError, 'Gönderilemedi. Tekrar deneyin.'))
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-4 text-5xl" aria-hidden>
          🙏
        </p>
        <h1 className="mb-2 text-3xl">Teşekkürler!</h1>
        <p className="mb-6 text-sm text-muted">Görüşünüz bize ulaştı.</p>
        <ButtonLink href="/">Kitaplara dön</ButtonLink>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl">💬 Görüş bildir</h1>
      <p className="mb-6 text-sm text-muted">
        Eksik bulduğunuz, beğendiğiniz ya da eklenmesini istediğiniz her şeyi yazın.
      </p>

      {!isAuthenticated && (
        <p className="mb-4 rounded-xl border border-line bg-white p-4 text-sm text-muted">
          Görüş göndermek için{' '}
          <ButtonLink href="/giris" size="sm">
            giriş yapın
          </ButtonLink>
          .
        </p>
      )}

      <form onSubmit={submit} className="rounded-panel border border-line bg-white p-5" noValidate>
        <FormMessage tone="error">{error}</FormMessage>

        <SelectField
          label="Konu *"
          required
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
        >
          <option value="">Seç…</option>
          {TOPICS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </SelectField>

        <TextAreaField
          label="Mesajınız *"
          required
          rows={5}
          maxLength={4000}
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Yazmaya başlayın…"
        />

        <Button type="submit" size="lg" className="w-full" disabled={busy || !isAuthenticated}>
          {busy ? 'Gönderiliyor…' : 'Gönder'}
        </Button>
      </form>
    </div>
  )
}
