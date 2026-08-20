'use client'

import { useState } from 'react'
import type { AdminBook } from '@/components/admin/AdminBookList'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormMessage, SelectField, TextAreaField, TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { createClient } from '@/lib/supabase/client'

/** Editörün kitap kaydını düzenlemesi. Yazma yetkisi RLS ile korunuyor. */
export function AdminBookDialog({
  book,
  onClose,
  onSaved,
}: {
  book: AdminBook
  onClose: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const [values, setValues] = useState({
    title: book.title,
    summary: book.summary,
    ageMin: book.age_min?.toString() ?? '',
    ageMax: book.age_max?.toString() ?? '',
    language: book.language,
    status: book.status,
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function patch(next: Partial<typeof values>) {
    setValues((current) => ({ ...current, ...next }))
  }

  async function save() {
    if (!values.title.trim()) {
      setError('Başlık boş olamaz.')
      return
    }
    const ageMin = values.ageMin === '' ? null : Number(values.ageMin)
    const ageMax = values.ageMax === '' ? null : Number(values.ageMax)
    if (ageMin !== null && ageMax !== null && ageMin > ageMax) {
      setError('Yaş aralığı ters girilmiş.')
      return
    }

    setBusy(true)
    const { error: updateError } = await createClient()
      .from('books')
      .update({
        title: values.title.trim(),
        summary: values.summary.trim(),
        age_min: ageMin,
        age_max: ageMax,
        language: values.language,
        status: values.status,
      })
      .eq('id', book.id)
    setBusy(false)

    if (updateError) {
      setError(updateError.message)
      return
    }
    toast.show('Kitap güncellendi.')
    onSaved()
  }

  return (
    <Dialog open onClose={onClose} title="Kitabı düzenle" subtitle={book.slug}>
      <FormMessage tone="error">{error}</FormMessage>

      <TextField
        label="Başlık *"
        value={values.title}
        onChange={(event) => patch({ title: event.target.value })}
      />
      <TextAreaField
        label="Özet"
        rows={3}
        value={values.summary}
        onChange={(event) => patch({ summary: event.target.value })}
      />
      <div className="flex gap-3">
        <TextField
          label="En küçük yaş"
          type="number"
          min={0}
          max={18}
          value={values.ageMin}
          onChange={(event) => patch({ ageMin: event.target.value })}
        />
        <TextField
          label="En büyük yaş"
          type="number"
          min={0}
          max={18}
          value={values.ageMax}
          onChange={(event) => patch({ ageMax: event.target.value })}
        />
      </div>
      <SelectField
        label="Dil"
        value={values.language}
        onChange={(event) => patch({ language: event.target.value as AdminBook['language'] })}
      >
        <option value="tr">Türkçe</option>
        <option value="en">İngilizce</option>
      </SelectField>
      <SelectField
        label="Durum"
        value={values.status}
        onChange={(event) => patch({ status: event.target.value as AdminBook['status'] })}
      >
        <option value="published">Yayında</option>
        <option value="draft">Taslak</option>
        <option value="archived">Arşiv</option>
      </SelectField>

      <p className="mb-4 rounded-xl bg-cream p-3 text-xs leading-relaxed text-muted">
        Buradaki değişiklik doğrudan veritabanına yazılır. Kalıcı olması için aynı değişikliği
        <code className="mx-1 rounded bg-white px-1">content/books.json</code>
        dosyasına da işleyin, yoksa bir sonraki senkronizasyonda geri alınır.
      </p>

      <Button className="w-full" onClick={() => void save()} disabled={busy}>
        {busy ? 'Kaydediliyor…' : 'Kaydet'}
      </Button>
    </Dialog>
  )
}
