'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { addNote, deleteNote, loadNotes } from '@/lib/data/library'
import type { NoteVisibility, ReadingNote } from '@/lib/data/types'
import { NOTE_VISIBILITY_LABELS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/client'

const VISIBILITY_ORDER: NoteVisibility[] = ['private', 'family', 'public']

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Kitap notları. Varsayılan gizlilik "özel" (PRD ilke 2). */
export function ReadingNotes({ libraryItemId }: { libraryItemId: string }) {
  const supabase = createClient()
  const toast = useToast()
  const [notes, setNotes] = useState<ReadingNote[]>([])
  const [body, setBody] = useState('')
  const [visibility, setVisibility] = useState<NoteVisibility>('private')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Kütüphane kaydı henüz sunucuya yazılmadıysa kimliği geçici bir
    // yer tutucudur (`optimistic-<bookId>`), gerçek bir UUID değil.
    // Sorgulamak PostgREST'ten 400 döndürüyor ve her seferinde konsola
    // başarısız bir istek düşüyordu. Gerçek kimlik gelince efekt yeniden
    // çalışıyor ve notlar yükleniyor.
    if (!UUID_PATTERN.test(libraryItemId)) {
      setNotes([])
      return
    }

    let cancelled = false
    void loadNotes(supabase, libraryItemId)
      .then((loaded) => {
        if (!cancelled) setNotes(loaded)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [supabase, libraryItemId])

  async function save() {
    const trimmed = body.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const note = await addNote(supabase, { libraryItemId, body: trimmed, visibility })
      setNotes((current) => [note, ...current])
      setBody('')
    } catch {
      toast.show('Not kaydedilemedi.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function remove(noteId: string) {
    const previous = notes
    setNotes((current) => current.filter((note) => note.id !== noteId))
    try {
      await deleteNote(supabase, noteId)
    } catch {
      setNotes(previous)
      toast.show('Not silinemedi.', 'error')
    }
  }

  function cycleVisibility() {
    const index = VISIBILITY_ORDER.indexOf(visibility)
    setVisibility(VISIBILITY_ORDER[(index + 1) % VISIBILITY_ORDER.length]!)
  }

  return (
    <section className="border-t border-line p-5">
      <h2 className="mb-3 text-xs font-bold tracking-wider text-muted uppercase">💬 Notlarım</h2>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void save()
          }}
          placeholder="Bu kitapla ilgili bir şeyler yaz…"
          aria-label="Not"
          maxLength={2000}
          className="min-w-40 flex-1 rounded-xl border-[1.5px] border-line bg-cream px-3.5 py-2.5 text-sm outline-none focus:border-accent"
        />
        <button
          type="button"
          onClick={cycleVisibility}
          title="Gizlilik ayarını değiştir"
          className={cn(
            'rounded-full border-[1.5px] px-3 py-2 text-xs font-semibold transition-colors',
            visibility === 'public'
              ? 'border-[#4CAF50] bg-success-soft text-success'
              : visibility === 'family'
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-[#FF9800] bg-warning-soft text-warning',
          )}
        >
          {NOTE_VISIBILITY_LABELS[visibility]}
        </button>
        <Button onClick={() => void save()} disabled={saving || !body.trim()}>
          Ekle
        </Button>
      </div>

      {notes.length === 0 ? (
        <p className="mt-3 text-center text-sm text-muted">Henüz not yok.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2.5">
          {notes.map((note) => (
            <li
              key={note.id}
              className={cn(
                'rounded-xl border p-3.5',
                note.visibility === 'private'
                  ? 'border-[#FFE0B2] bg-[#FFF8F0]'
                  : 'border-line bg-cream',
              )}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[11px] text-muted">
                  {new Date(note.createdAt).toLocaleDateString('tr-TR')}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-muted">
                    {NOTE_VISIBILITY_LABELS[note.visibility]}
                  </span>
                  <button
                    type="button"
                    onClick={() => void remove(note.id)}
                    aria-label="Notu sil"
                    className="text-xs text-muted transition-colors hover:text-danger"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <p className="text-[13px] leading-relaxed text-ink-soft">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
