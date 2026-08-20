'use client'

import { useState, type FormEvent } from 'react'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button, ButtonLink } from '@/components/ui/Button'
import { FormMessage, TextAreaField, TextField } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import { isValidTurkishPhone } from '@/lib/phone'
import { createClient } from '@/lib/supabase/client'

interface Organization {
  id: string
  name: string
  description: string | null
}

export function DonationForm({ organizations }: { organizations: Organization[] }) {
  const { userId } = useAppData()
  const [values, setValues] = useState({
    organizationId: '',
    fullName: '',
    phone: '',
    city: '',
    address: '',
    note: '',
  })
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  function patch(next: Partial<typeof values>) {
    setValues((current) => ({ ...current, ...next }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    if (!values.organizationId) {
      setError('Lütfen bir kurum seçin.')
      return
    }
    if (!values.fullName.trim() || !values.city.trim() || !values.address.trim()) {
      setError('Ad, şehir ve adres zorunlu.')
      return
    }
    if (!isValidTurkishPhone(values.phone)) {
      setError('Geçerli bir cep telefonu girin.')
      return
    }
    if (!userId) {
      setError('Bağış talebi için giriş yapmanız gerekiyor.')
      return
    }

    setBusy(true)
    const { error: insertError } = await createClient()
      .from('donation_requests')
      .insert({
        user_id: userId,
        organization_id: values.organizationId,
        full_name: values.fullName.trim(),
        phone: values.phone.trim(),
        city: values.city.trim(),
        address: values.address.trim(),
        note: values.note.trim() || null,
      })
    setBusy(false)

    if (insertError) {
      setError('Talep kaydedilemedi. Tekrar deneyin.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="mb-4 text-5xl" aria-hidden>
          💚
        </p>
        <h1 className="mb-2 text-3xl">Talebiniz alındı</h1>
        <p className="mb-6 text-sm leading-relaxed text-muted">
          {organizations.find((item) => item.id === values.organizationId)?.name ??
            'Seçtiğiniz kurum'}{' '}
          ile paylaşılacak. Kurum sizinle telefon üzerinden iletişime geçecek.
        </p>
        <ButtonLink href="/">Kitaplara dön</ButtonLink>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl">📚 Kitap bağışı</h1>
      <p className="mb-6 text-sm leading-relaxed text-muted">
        Evinizdeki kitapları bağışlamak mı istiyorsunuz? Seçtiğiniz kurum sizi arayıp kitapları
        almaya gelsin.
      </p>

      <form onSubmit={submit} className="rounded-panel border border-line bg-white p-5" noValidate>
        <FormMessage tone="error">{error}</FormMessage>

        <fieldset className="mb-4">
          <legend className="mb-2 block text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
            Kurum seçin *
          </legend>
          <div className="flex flex-col gap-2">
            {organizations.map((organization) => (
              <label
                key={organization.id}
                className={cn(
                  'flex cursor-pointer items-start gap-2.5 rounded-xl border-[1.5px] px-3.5 py-3 text-sm transition-colors',
                  values.organizationId === organization.id
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line hover:border-accent',
                )}
              >
                <input
                  type="radio"
                  name="organization"
                  value={organization.id}
                  checked={values.organizationId === organization.id}
                  onChange={() => patch({ organizationId: organization.id })}
                  className="mt-0.5 size-4 shrink-0 accent-[#27ae60]"
                />
                <span>
                  <span className="block font-semibold">{organization.name}</span>
                  {organization.description && (
                    <span className="mt-0.5 block text-xs text-muted">
                      {organization.description}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <TextField
          label="Ad soyad *"
          required
          value={values.fullName}
          onChange={(event) => patch({ fullName: event.target.value })}
        />
        <TextField
          label="Telefon *"
          type="tel"
          required
          value={values.phone}
          onChange={(event) => patch({ phone: event.target.value })}
          placeholder="0532 123 45 67"
        />
        <TextField
          label="Şehir *"
          required
          value={values.city}
          onChange={(event) => patch({ city: event.target.value })}
          placeholder="İstanbul"
        />
        <TextAreaField
          label="Adres *"
          required
          rows={2}
          value={values.address}
          onChange={(event) => patch({ address: event.target.value })}
          placeholder="Mahalle, sokak, bina no…"
        />
        <TextAreaField
          label="Açıklama"
          rows={2}
          value={values.note}
          onChange={(event) => patch({ note: event.target.value })}
          placeholder="Yaklaşık kaç kitap, hangi yaş grubu…"
        />

        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'Gönderiliyor…' : 'Bağış talebi gönder'}
        </Button>
      </form>
    </div>
  )
}
