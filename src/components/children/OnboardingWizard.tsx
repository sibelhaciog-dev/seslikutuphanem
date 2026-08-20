'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { AvatarFigure } from '@/components/avatar/AvatarFigure'
import { ChildForm } from '@/components/children/ChildForm'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button } from '@/components/ui/Button'
import { ageFromBirthDate } from '@/lib/age'
import {
  completeOnboarding,
  createChild,
  emptyChildForm,
  type ChildFormValues,
} from '@/lib/data/children'
import { cn } from '@/lib/cn'
import { createClient } from '@/lib/supabase/client'

type Step = 'sayi' | 'form' | 'ozet'

export function OnboardingWizard() {
  const router = useRouter()
  const { userId, children, loading, refreshChildren } = useAppData()
  const [step, setStep] = useState<Step>('sayi')
  const [total, setTotal] = useState(0)
  const [saved, setSaved] = useState<ChildFormValues[]>([])
  const [values, setValues] = useState<ChildFormValues>(emptyChildForm)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Profili olan kullanıcı yanlışlıkla buraya gelirse ana sayfaya yönlendir.
  useEffect(() => {
    if (!loading && children.length > 0 && saved.length === 0) router.replace('/')
  }, [loading, children.length, saved.length, router])

  async function saveCurrent() {
    if (!userId) return
    setBusy(true)
    setError('')
    try {
      await createChild(createClient(), userId, values, saved.length)
      const next = [...saved, values]
      setSaved(next)
      setValues(emptyChildForm())
      if (next.length >= total) {
        await refreshChildren()
        setStep('ozet')
      }
    } catch {
      setError('Profil kaydedilemedi. Tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-line bg-white p-8 shadow-dialog">
        {step === 'sayi' && (
          <>
            <p className="mb-4 text-center text-5xl" aria-hidden>
              👨‍👩‍👧‍👦
            </p>
            <h1 className="text-center text-2xl">Hoş geldiniz!</h1>
            <p className="mt-2 mb-7 text-center text-sm leading-relaxed text-muted">
              Kaç çocuğunuz için profil oluşturmak istersiniz? Sonradan yeni profil
              ekleyebilirsiniz.
            </p>
            <div className="mb-6 grid grid-cols-4 gap-2.5">
              {[1, 2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setTotal(count)}
                  aria-pressed={total === count}
                  className={cn(
                    'rounded-xl border-2 py-4 text-xl font-bold transition-colors',
                    total === count
                      ? 'border-accent bg-accent-soft text-accent'
                      : 'border-line text-ink hover:border-accent hover:text-accent',
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
            <Button
              size="lg"
              className="w-full"
              disabled={total === 0}
              onClick={() => setStep('form')}
            >
              Devam et →
            </Button>
          </>
        )}

        {step === 'form' && (
          <>
            <div className="mb-6 flex gap-1.5" aria-hidden>
              {Array.from({ length: total }, (_, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1 flex-1 rounded-full',
                    index <= saved.length ? 'bg-accent' : 'bg-line',
                  )}
                />
              ))}
            </div>
            <h1 className="text-2xl">{saved.length + 1}. çocuğunuzun bilgileri</h1>
            <p className="mt-1 mb-6 text-sm text-muted">
              Bu bilgiler kitap önerilerini kişiselleştirmek için kullanılır.
            </p>
            <ChildForm
              value={values}
              onChange={setValues}
              onSubmit={() => void saveCurrent()}
              busy={busy}
              error={error}
              submitLabel={saved.length + 1 < total ? 'Sonraki çocuk →' : 'Tamamla →'}
            />
          </>
        )}

        {step === 'ozet' && (
          <>
            <p className="mb-4 text-center text-5xl" aria-hidden>
              🎉
            </p>
            <h1 className="text-center text-2xl">Harika!</h1>
            <p className="mt-2 mb-6 text-center text-sm text-muted">
              Profiller hazır. Hadi kitap keşfetmeye başlayalım.
            </p>
            <ul className="mb-6 flex flex-col gap-2.5">
              {children.map((child) => (
                <li
                  key={child.id}
                  className="flex items-center gap-3 rounded-xl border border-line bg-cream p-3"
                >
                  <AvatarFigure characterId={child.avatarCharacter} headOnly size={40} />
                  <div>
                    <p className="text-sm font-semibold">{child.name}</p>
                    {child.birthDate && (
                      <p className="text-xs text-muted">
                        {ageFromBirthDate(child.birthDate)} yaşında
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            <Button
              size="lg"
              className="w-full"
              onClick={async () => {
                // Önce kaydı bitir, sonra git. `router.refresh()` çağrılmıyor:
                // farklı bir rotaya gidince sunucu bileşenleri zaten yeniden
                // çalışıyor ve push ile birlikte çağrılınca gezinmeyi iptal
                // ediyor (kullanıcı onboarding'de takılı kalıyordu).
                if (userId) {
                  try {
                    await completeOnboarding(createClient(), userId)
                  } catch {
                    // Kayıt tamamlandı işareti konamazsa da kullanıcıyı bekletme.
                  }
                }
                router.push('/')
              }}
            >
              📚 Kitaplara git →
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
