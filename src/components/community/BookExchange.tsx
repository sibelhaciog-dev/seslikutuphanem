'use client'

import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { FormMessage, SelectField, TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { isValidTurkishPhone, toWhatsAppNumber } from '@/lib/phone'
import { toFriendlyMessage } from '@/lib/errors'
import { createClient } from '@/lib/supabase/client'
import { LIMITS, validateText } from '@/lib/validation'
import { ageLabel, BOOK_CONDITION_LABELS } from '@/lib/labels'

const CONDITIONS = ['new', 'good', 'worn'] as const

interface ExchangeListing {
  id: string
  title: string
  authorName: string | null
  ageMin: number | null
  ageMax: number | null
  condition: (typeof CONDITIONS)[number]
  offer: string | null
  contactName: string
  city: string
  district: string | null
  phone: string
  createdAt: string
  isMine: boolean
}

export function BookExchange() {
  const { userId } = useAppData()
  const toast = useToast()
  const [tab, setTab] = useState<'liste' | 'ekle'>('liste')
  const [listings, setListings] = useState<ExchangeListing[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const { data } = await createClient()
      .from('exchange_listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    setListings(
      (data ?? []).map((row) => ({
        id: row.id,
        title: row.title,
        authorName: row.author_name,
        ageMin: row.age_min,
        ageMax: row.age_max,
        condition: row.condition,
        offer: row.offer,
        contactName: row.contact_name,
        city: row.city,
        district: row.district,
        phone: row.phone,
        createdAt: row.created_at,
        isMine: row.owner_id === userId,
      })),
    )
    setLoading(false)
  }, [userId])

  useEffect(() => {
    void load()
  }, [load])

  async function remove(id: string) {
    const { error } = await createClient().from('exchange_listings').delete().eq('id', id)
    if (error) {
      toast.show('İlan silinemedi.', 'error')
      return
    }
    setListings((current) => current.filter((item) => item.id !== id))
    toast.show('İlan kaldırıldı.')
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-1 text-3xl">🔄 Kitap takası</h1>
      <p className="mb-6 text-sm text-muted">
        Çocuğunuzun okuyup bitirdiği kitapları başka ebeveynlerle takas edin.
      </p>

      <div className="mb-6 flex border-b border-line">
        {(
          [
            ['liste', 'İlanlar'],
            ['ekle', 'İlan ver'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setTab(value)}
            aria-pressed={tab === value}
            className={cn(
              'flex-1 border-b-2 py-3 text-[13px] font-semibold transition-colors',
              tab === value
                ? 'border-accent text-accent'
                : 'border-transparent text-muted hover:text-ink',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'liste' ? (
        loading ? (
          <p className="text-sm text-muted">Yükleniyor…</p>
        ) : listings.length === 0 ? (
          <EmptyState
            icon="📚"
            title="Henüz ilan yok"
            description="İlk ilanı siz verin — “İlan ver” sekmesinden."
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {listings.map((listing) => (
              <li key={listing.id} className="rounded-panel border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">📖 {listing.title}</p>
                    <p className="text-[11px] text-muted">
                      {[
                        listing.authorName,
                        ageLabel(listing.ageMin, listing.ageMax),
                        BOOK_CONDITION_LABELS[listing.condition],
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                    {listing.offer && (
                      <p className="mt-1 text-xs text-[#764ba2]">🔄 {listing.offer}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-ink">{listing.contactName}</p>
                    <p className="mb-1.5 text-[11px] text-muted">
                      {[listing.city, listing.district].filter(Boolean).join(' / ')}
                    </p>
                    {listing.isMine ? (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => {
                          // Tek yanlış tıklamayla ilan siliniyordu; geri alınamıyor.
                          const onaylandi = window.confirm(
                            `"${listing.title}" ilanı kaldırılacak. Bu işlem geri alınamaz. Emin misiniz?`,
                          )
                          if (onaylandi) void remove(listing.id)
                        }}
                      >
                        İlanı kaldır
                      </Button>
                    ) : (
                      <a
                        href={`https://wa.me/${toWhatsAppNumber(listing.phone)}?text=${encodeURIComponent(
                          `Merhaba! Sesli Kütüphanem üzerinden yazıyorum. "${listing.title}" kitabını takas etmek isterim. 📚`,
                        )}`}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-[11px] font-bold text-white"
                      >
                        💬 İletişime geç
                      </a>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )
      ) : (
        <ExchangeForm
          onCreated={() => {
            void load()
            setTab('liste')
          }}
        />
      )}
    </div>
  )
}

function ExchangeForm({ onCreated }: { onCreated: () => void }) {
  const { userId } = useAppData()
  const toast = useToast()
  const [values, setValues] = useState({
    title: '',
    authorName: '',
    condition: 'good' as (typeof CONDITIONS)[number],
    offer: '',
    contactName: '',
    city: '',
    district: '',
    phone: '',
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function patch(next: Partial<typeof values>) {
    setValues((current) => ({ ...current, ...next }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')

    const lengthError =
      validateText(values.title, LIMITS.exchangeTitle, 'Kitap adı') ??
      validateText(values.contactName, LIMITS.exchangeContactName, 'Adınız') ??
      validateText(values.city, { min: 1, max: 80 }, 'Şehir') ??
      (values.offer.trim()
        ? validateText(values.offer, { min: 0, max: LIMITS.exchangeOffer.max }, 'Takas notu')
        : undefined)
    if (lengthError) {
      setError(lengthError)
      return
    }
    if (!isValidTurkishPhone(values.phone)) {
      setError('Geçerli bir cep telefonu girin (örn. 0532 123 45 67).')
      return
    }
    if (!userId) {
      setError('İlan vermek için giriş yapmanız gerekiyor.')
      return
    }

    setBusy(true)
    const { error: insertError } = await createClient()
      .from('exchange_listings')
      .insert({
        owner_id: userId,
        title: values.title.trim(),
        author_name: values.authorName.trim() || null,
        condition: values.condition,
        offer: values.offer.trim() || null,
        contact_name: values.contactName.trim(),
        city: values.city.trim(),
        district: values.district.trim() || null,
        phone: values.phone.trim(),
      })
    setBusy(false)

    if (insertError) {
      setError(toFriendlyMessage(insertError, 'İlan kaydedilemedi. Tekrar deneyin.'))
      return
    }
    toast.show('İlanınız yayınlandı.')
    onCreated()
  }

  return (
    <form onSubmit={submit} className="rounded-panel border border-line bg-white p-5" noValidate>
      <FormMessage tone="error">{error}</FormMessage>

      <TextField
        label="Kitap adı *"
        required
        value={values.title}
        onChange={(event) => patch({ title: event.target.value })}
        placeholder="Örn: Çaya Gelen Kaplan"
      />
      <TextField
        label="Yazar"
        value={values.authorName}
        onChange={(event) => patch({ authorName: event.target.value })}
      />
      <SelectField
        label="Kitabın durumu"
        value={values.condition}
        onChange={(event) =>
          patch({ condition: event.target.value as (typeof CONDITIONS)[number] })
        }
      >
        {CONDITIONS.map((condition) => (
          <option key={condition} value={condition}>
            {BOOK_CONDITION_LABELS[condition]}
          </option>
        ))}
      </SelectField>
      <TextField
        label="Ne ile takas edersiniz?"
        value={values.offer}
        onChange={(event) => patch({ offer: event.target.value })}
        placeholder="Örn: Herhangi bir çocuk kitabı"
      />
      <TextField
        label="Adınız *"
        required
        value={values.contactName}
        onChange={(event) => patch({ contactName: event.target.value })}
      />
      <TextField
        label="Şehir *"
        required
        value={values.city}
        onChange={(event) => patch({ city: event.target.value })}
        placeholder="İstanbul"
      />
      <TextField
        label="İlçe"
        value={values.district}
        onChange={(event) => patch({ district: event.target.value })}
        placeholder="Kadıköy"
      />
      <TextField
        label="Telefon *"
        type="tel"
        required
        value={values.phone}
        onChange={(event) => patch({ phone: event.target.value })}
        placeholder="0532 123 45 67"
        hint="Numaranız yalnızca giriş yapmış kullanıcılara görünür."
      />

      <Button type="submit" size="lg" className="w-full" disabled={busy}>
        {busy ? 'Yayınlanıyor…' : 'İlanı yayınla'}
      </Button>
    </form>
  )
}
