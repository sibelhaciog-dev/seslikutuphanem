'use client'

import { useRef, useState } from 'react'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { FormMessage, TextAreaField, TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { resizeImage, validateImageFile } from '@/lib/image'

interface ScanResult {
  kitapAdi: string
  yazar: string
  ozet: string
}

/** Fotoğraftan kitap tanıma — sunucudaki /api/kapak-tani ucunu kullanır. */
export function CoverScanDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addCustomBook } = useAppData()
  const toast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [result, setResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() {
    setPreview(null)
    setResult(null)
    setError('')
    setBusy(false)
  }

  async function scan(file: File) {
    const problem = validateImageFile(file)
    if (problem) {
      setError(problem)
      return
    }

    setError('')
    setBusy(true)
    try {
      const resized = await resizeImage(file, 900, 1200, 0.85)
      setPreview(resized.dataUrl)

      const response = await fetch('/api/kapak-tani', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: resized.dataUrl.split(',')[1],
          mediaType: 'image/jpeg',
        }),
      })

      const payload = await response.json()
      if (!response.ok) {
        setError(payload.hata ?? 'Kapak tanınamadı.')
        return
      }
      setResult(payload as ScanResult)
    } catch {
      setError('Bir sorun oluştu, tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  async function add() {
    if (!result?.kitapAdi.trim()) {
      setError('Kitap adı boş olamaz.')
      return
    }
    try {
      await addCustomBook({
        title: result.kitapAdi.trim(),
        authorName: result.yazar.trim() || null,
        summary: result.ozet.trim() || null,
        origin: 'camera',
      })
      toast.show('Okuma listesine eklendi.')
      reset()
      onClose()
    } catch {
      setError('Eklenemedi, tekrar deneyin.')
    }
  }

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset()
        onClose()
      }}
      title="📷 Kitap kapağı tara"
      subtitle="Fotoğraf çekin, kitabı tanıyalım"
      headerClassName="bg-linear-[135deg,#667eea,#764ba2]"
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) void scan(file)
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mb-4 w-full rounded-2xl border-2 border-dashed border-[#d0c0f0] px-4 py-6 text-center transition-colors hover:border-[#764ba2]"
      >
        <span className="block text-4xl" aria-hidden>
          📸
        </span>
        <span className="mt-2 block text-sm font-semibold text-[#764ba2]">
          Fotoğraf çek veya seç
        </span>
        <span className="mt-1 block text-xs text-muted">
          Kitabın kapağını gösterin, gerisini biz halledelim
        </span>
      </button>

      {preview && (
        // Yerel önizleme; harici bir kaynak değil.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt="Seçilen kapak fotoğrafı"
          className="mx-auto mb-4 max-h-48 rounded-xl shadow-card"
        />
      )}

      {busy && (
        <p className="py-4 text-center text-sm font-semibold text-[#764ba2]" role="status">
          🔍 Kitap tanınıyor…
        </p>
      )}

      <FormMessage tone="error">{error}</FormMessage>

      {result && (
        <div className="rounded-xl border-[1.5px] border-[#c0a0f0] bg-[#f5f0ff] p-4">
          <p className="mb-3 text-xs font-bold text-[#764ba2]">✨ Bulunanlar</p>
          <TextField
            label="Kitap adı"
            value={result.kitapAdi}
            onChange={(event) => setResult({ ...result, kitapAdi: event.target.value })}
          />
          <TextField
            label="Yazar"
            value={result.yazar}
            onChange={(event) => setResult({ ...result, yazar: event.target.value })}
          />
          <TextAreaField
            label="Kısa özet"
            rows={2}
            value={result.ozet}
            onChange={(event) => setResult({ ...result, ozet: event.target.value })}
          />
          <Button className="w-full" onClick={() => void add()}>
            📚 Okuma listeme ekle
          </Button>
        </div>
      )}
    </Dialog>
  )
}
