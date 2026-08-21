'use client'

import { useEffect, useState } from 'react'
import { AvatarFigure } from '@/components/avatar/AvatarFigure'
import { AvatarStudio } from '@/components/children/AvatarStudio'
import { ChildForm, childToForm } from '@/components/children/ChildForm'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { ageFromBirthDate } from '@/lib/age'
import {
  archiveChild,
  createChild,
  emptyChildForm,
  updateChild,
  type ChildFormValues,
} from '@/lib/data/children'
import { cn } from '@/lib/cn'
import { loadPointsByChild } from '@/lib/data/library'
import { toFriendlyError } from '@/lib/errors'
import { createClient } from '@/lib/supabase/client'
import type { Child } from '@/lib/data/types'

type EditorState = { mode: 'yeni' } | { mode: 'duzenle'; child: Child } | null

export function ProfileManager() {
  const { userId, userEmail, children, activeChildId, setActiveChildId, refreshChildren } =
    useAppData()
  const toast = useToast()
  // Puanlar çocuk başına ayrı: aktif çocuğunkini hepsine göstermek yanlış olur.
  const [pointsByChild, setPointsByChild] = useState<Record<string, number>>({})
  const [editor, setEditor] = useState<EditorState>(null)
  const [values, setValues] = useState<ChildFormValues>(emptyChildForm)
  const [avatarChild, setAvatarChild] = useState<Child | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (children.length === 0) return
    let cancelled = false
    void loadPointsByChild(
      createClient(),
      children.map((child) => child.id),
    ).then((points) => {
      if (!cancelled) setPointsByChild(points)
    })
    return () => {
      cancelled = true
    }
  }, [children])

  function openNew() {
    setValues(emptyChildForm())
    setError('')
    setFieldErrors({})
    setEditor({ mode: 'yeni' })
  }

  function openEdit(child: Child) {
    setValues(childToForm(child))
    setError('')
    setFieldErrors({})
    setEditor({ mode: 'duzenle', child })
  }

  async function save() {
    if (!editor || !userId) return
    setBusy(true)
    setError('')
    setFieldErrors({})
    try {
      const supabase = createClient()
      if (editor.mode === 'yeni') {
        const id = await createChild(supabase, userId, values, children.length)
        await refreshChildren()
        setActiveChildId(id)
      } else {
        await updateChild(supabase, editor.child.id, values)
        await refreshChildren()
      }
      setEditor(null)
      toast.show('Profil kaydedildi.')
    } catch (caught) {
      const friendly = toFriendlyError(caught, 'Kaydedilemedi. Tekrar deneyin.')
      if (friendly.field) setFieldErrors({ [friendly.field]: friendly.message })
      else setError(friendly.message)
    } finally {
      setBusy(false)
    }
  }

  async function remove(child: Child) {
    const confirmed = window.confirm(
      `${child.name} profili listeden kaldırılacak. Okuma geçmişi saklanır. Emin misiniz?`,
    )
    if (!confirmed) return
    try {
      await archiveChild(createClient(), child.id)
      await refreshChildren()
      toast.show('Profil kaldırıldı.')
    } catch {
      toast.show('Profil kaldırılamadı.', 'error')
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl">Profiller</h1>
        <p className="mt-1 text-sm text-muted">{userEmail} hesabına bağlı çocuk profilleri</p>
      </header>

      {children.length === 0 ? (
        <EmptyState
          icon="👶"
          title="Henüz profil yok"
          description="Kitap önerilerinin kişiselleşmesi için bir çocuk profili ekleyin."
          action={<Button onClick={openNew}>+ Çocuk ekle</Button>}
        />
      ) : (
        <ul className="mb-5 flex flex-col gap-3">
          {children.map((child) => {
            const active = child.id === activeChildId
            return (
              <li
                key={child.id}
                className={cn(
                  'flex flex-wrap items-center gap-4 rounded-panel border bg-white p-4',
                  active ? 'border-accent' : 'border-line',
                )}
              >
                <button
                  type="button"
                  onClick={() => setAvatarChild(child)}
                  title="Avatarı düzenle"
                  aria-label={`${child.name} avatarını düzenle`}
                  className="shrink-0 rounded-full bg-accent-soft p-1"
                >
                  <AvatarFigure
                    characterId={child.avatarCharacter}
                    accessories={child.avatarAccessories}
                    headOnly
                    size={56}
                  />
                </button>

                <div className="min-w-32 flex-1">
                  <p className="flex items-center gap-2 font-serif text-lg">
                    {child.name}
                    {active && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-white">
                        Aktif
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted">
                    {child.birthDate ? `${ageFromBirthDate(child.birthDate)} yaşında` : 'Yaş yok'}
                    {` · ⭐ ${pointsByChild[child.id] ?? 0} puan`}
                  </p>
                  {child.interestSlugs.length > 0 && (
                    <p className="mt-1 text-xs text-muted">
                      {child.interestSlugs.length} ilgi alanı seçili
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  {!active && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setActiveChildId(child.id)}
                    >
                      Aktif yap
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={() => openEdit(child)}>
                    ✏️ Düzenle
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void remove(child)}>
                    Kaldır
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {children.length > 0 && children.length < 6 && (
        <Button variant="secondary" onClick={openNew}>
          + Yeni çocuk ekle
        </Button>
      )}

      <Dialog
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={editor?.mode === 'duzenle' ? 'Profili düzenle' : 'Yeni çocuk profili'}
      >
        <ChildForm
          value={values}
          onChange={setValues}
          onSubmit={() => void save()}
          busy={busy}
          error={error}
          fieldErrors={fieldErrors}
          submitLabel="Kaydet ✓"
        />
      </Dialog>

      {avatarChild && (
        <AvatarStudio
          child={avatarChild}
          points={pointsByChild[avatarChild.id] ?? 0}
          onClose={() => setAvatarChild(null)}
        />
      )}
    </div>
  )
}
