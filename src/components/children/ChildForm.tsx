'use client'

import { useState, type Dispatch, type SetStateAction } from 'react'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button } from '@/components/ui/Button'
import { FormMessage, TextField } from '@/components/ui/Field'
import { cn } from '@/lib/cn'
import type { ChildFormValues } from '@/lib/data/children'
import type { Child, Gender } from '@/lib/data/types'
import { GENDER_LABELS } from '@/lib/labels'
import { earliestBirthDate, LIMITS, todayISO, validateBirthDate, validateText } from '@/lib/validation'

export function childToForm(child: Child): ChildFormValues {
  return {
    name: child.name,
    birthDate: child.birthDate ?? '',
    gender: child.gender,
    interestSlugs: [...child.interestSlugs],
    focusTopicSlugs: [...child.focusTopicSlugs],
  }
}

interface ChildFormProps {
  value: ChildFormValues
  /**
   * `useState` kurucusunun kendisi beklenir (değer alan sade bir geri çağırma
   * değil). Böylece güncellemeler bir önceki duruma göre yapılır; aynı
   * karede art arda gelen değişiklikler birbirini ezmez.
   */
  onChange: Dispatch<SetStateAction<ChildFormValues>>
  onSubmit: () => void
  submitLabel: string
  busy?: boolean
  error?: string
  /**
   * Sunucudan dönen ve belirli bir alana ait olan hatalar
   * (bkz. `toFriendlyError`). İstemci doğrulaması kaçırırsa bunlar devreye
   * girer; böylece kullanıcı yine de hangi alanı düzelteceğini görür.
   */
  fieldErrors?: Record<string, string>
}

const GENDERS: Gender[] = ['girl', 'boy', 'unspecified']

export function ChildForm({
  value,
  onChange,
  onSubmit,
  submitLabel,
  busy = false,
  error = '',
  fieldErrors = {},
}: ChildFormProps) {
  const { taxonomy } = useAppData()
  const [touched, setTouched] = useState(false)

  // Sınırlar her render'da hesaplanıyor: modül yüklenirken bir kez
  // hesaplansaydı, sayfa gece yarısını geçerse "bugün" dünde kalırdı.
  const maxBirthDate = todayISO()
  const minBirthDate = earliestBirthDate()

  const localNameError = validateText(value.name, LIMITS.childName, 'Çocuğun adı')
  const localDateError = validateBirthDate(value.birthDate)

  // Kullanıcı gönderene kadar hata gösterme; gönderdikten sonra hem kendi
  // kontrollerimizi hem sunucudan geleni göster.
  const nameError = fieldErrors.name ?? (touched ? localNameError : undefined)
  const dateError = fieldErrors.birthDate ?? (touched ? localDateError : undefined)

  // Güncellemeler bir önceki duruma göre yapılır: aynı karede art arda gelen
  // değişiklikler (hızlı tıklama) birbirini ezmesin diye.
  function patch(next: Partial<ChildFormValues>) {
    onChange((current) => ({ ...current, ...next }))
  }

  function toggle(list: 'interestSlugs' | 'focusTopicSlugs', slug: string) {
    onChange((current) => ({
      ...current,
      [list]: current[list].includes(slug)
        ? current[list].filter((item) => item !== slug)
        : [...current[list], slug],
    }))
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        setTouched(true)
        // Veritabanının reddedeceği veriyi hiç göndermiyoruz: eskiden
        // gönderiliyor, ham Postgres hatası dönüyor ve kullanıcı neyin
        // yanlış olduğunu anlamadan sihirbazda sıkışıyordu.
        if (localNameError || localDateError) return
        onSubmit()
      }}
      noValidate
    >
      <FormMessage tone="error">{error}</FormMessage>

      <TextField
        label="Çocuğun adı *"
        required
        maxLength={LIMITS.childName.max}
        value={value.name}
        error={nameError}
        onChange={(event) => patch({ name: event.target.value })}
        placeholder="Örn: Elif"
      />

      <TextField
        label="Doğum tarihi *"
        type="date"
        required
        max={maxBirthDate}
        min={minBirthDate}
        value={value.birthDate}
        error={dateError}
        hint="Yaşa uygun kitapları göstermek için kullanılır."
        onChange={(event) => patch({ birthDate: event.target.value })}
      />

      <fieldset className="mb-3.5">
        <legend className="mb-1.5 block text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
          Cinsiyet
        </legend>
        <div className="flex flex-wrap gap-2">
          {GENDERS.map((gender) => (
            <button
              key={gender}
              type="button"
              onClick={() => patch({ gender })}
              aria-pressed={value.gender === gender}
              className={cn(
                'flex-1 rounded-xl border-2 px-2 py-2.5 text-[13px] whitespace-nowrap transition-colors',
                value.gender === gender
                  ? 'border-accent bg-accent-soft font-semibold text-accent'
                  : 'border-line text-ink-soft hover:border-accent',
              )}
            >
              {GENDER_LABELS[gender]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="mb-4">
        <legend className="mb-1.5 block text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
          İlgi alanları{' '}
          <span className="font-normal normal-case">(birden fazla seçebilirsiniz)</span>
        </legend>
        <div className="flex flex-wrap gap-2">
          {taxonomy.interests.map((interest) => {
            const selected = value.interestSlugs.includes(interest.slug)
            return (
              <button
                key={interest.slug}
                type="button"
                onClick={() => toggle('interestSlugs', interest.slug)}
                aria-pressed={selected}
                className={cn(
                  'rounded-full border-[1.5px] px-3 py-1.5 text-xs transition-colors',
                  selected
                    ? 'border-accent bg-accent-soft font-semibold text-accent'
                    : 'border-line text-ink-soft hover:border-accent hover:text-accent',
                )}
              >
                {interest.emoji} {interest.name}
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="mb-5">
        <legend className="mb-1.5 block text-[11px] font-bold tracking-[0.06em] text-muted uppercase">
          Şu sıralar önem verdiğiniz konular{' '}
          <span className="font-normal normal-case">(isteğe bağlı)</span>
        </legend>
        <p className="mb-2 text-xs text-muted">
          Seçtiğiniz konulardaki kitaplar önerilerde öne çıkar.
        </p>
        <div className="max-h-44 overflow-y-auto rounded-xl border border-line p-2">
          {taxonomy.areas.map((area) => (
            <div key={area.slug} className="mb-2 last:mb-0">
              <p className="mb-1 text-[11px] font-bold text-muted">
                {area.emoji} {area.name.replace(' Rehberi', '')}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {area.topics.map((topic) => {
                  const selected = value.focusTopicSlugs.includes(topic.slug)
                  return (
                    <button
                      key={topic.slug}
                      type="button"
                      onClick={() => toggle('focusTopicSlugs', topic.slug)}
                      aria-pressed={selected}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-[11px] transition-colors',
                        selected
                          ? 'border-accent bg-accent-soft font-semibold text-accent'
                          : 'border-line text-ink-soft hover:border-accent',
                      )}
                    >
                      {topic.label ?? topic.name}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      <Button type="submit" size="lg" disabled={busy} className="w-full">
        {busy ? 'Kaydediliyor…' : submitLabel}
      </Button>
    </form>
  )
}
