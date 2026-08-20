'use client'

import { useState } from 'react'
import { cn } from '@/lib/cn'

/** Başlıktan kararlı (her seferinde aynı) bir renk üretir. */
function hueFromTitle(title: string): number {
  let hash = 0
  for (let index = 0; index < title.length; index += 1) {
    hash = (hash * 31 + title.charCodeAt(index)) % 360
  }
  return hash
}

const SHELF_EMOJI = ['📕', '📗', '📘', '📙', '📖', '📚']

interface BookCoverProps {
  title: string
  src?: string | null
  className?: string
  compact?: boolean
}

/**
 * Kapak yoksa (ki çoğu kitapta yok — bkz. docs/prd.md §8) başlıktan üretilen
 * tipografik bir kapak gösterilir. Boş gri kutu yerine kasıtlı bir tasarım.
 */
export function BookCover({ title, src, className, compact = false }: BookCoverProps) {
  const [failed, setFailed] = useState(false)

  if (src && !failed) {
    return (
      // Kapaklar kullanıcı yüklemeleri ve harici kaynaklardan geliyor; hata
      // durumunda yedek tasarıma düşebilmek için düz img kullanılıyor.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={`${title} kapağı`}
        loading="lazy"
        onError={() => setFailed(true)}
        className={cn('size-full object-cover', className)}
      />
    )
  }

  const hue = hueFromTitle(title)
  const emoji = SHELF_EMOJI[hue % SHELF_EMOJI.length]

  return (
    <div
      className={cn(
        'relative flex size-full items-center justify-center overflow-hidden',
        className,
      )}
      style={{
        background: `linear-gradient(150deg, hsl(${hue} 62% 90%), hsl(${(hue + 40) % 360} 55% 80%))`,
      }}
      role="img"
      aria-label={`${title} — kapak görseli yok`}
    >
      {/* Kitap sırtını andıran dekoratif şerit. */}
      <span
        className="absolute inset-y-0 left-0 w-[7%]"
        style={{ background: `hsl(${hue} 45% 68%)` }}
        aria-hidden
      />
      <span className={compact ? 'text-2xl' : 'text-5xl'} aria-hidden>
        {emoji}
      </span>
    </div>
  )
}
