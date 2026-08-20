'use client'

import { cn } from '@/lib/cn'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md'
  label?: string
}

/**
 * Aynı yıldıza tekrar basmak puanı sıfırlar — eski sürümdeki davranışın aynısı.
 */
export function StarRating({ value, onChange, size = 'md', label }: StarRatingProps) {
  const readOnly = !onChange

  if (readOnly) {
    return (
      <span
        className={cn('text-[#F5A623]', size === 'sm' ? 'text-xs' : 'text-base')}
        aria-label={`${value} yıldız`}
      >
        {'★'.repeat(value)}
        <span className="opacity-30">{'★'.repeat(5 - value)}</span>
      </span>
    )
  }

  return (
    <div className="flex gap-1" role="group" aria-label={label ?? 'Puan ver'}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          aria-label={`${star} yıldız`}
          aria-pressed={value >= star}
          onClick={(event) => {
            event.stopPropagation()
            onChange(value === star ? 0 : star)
          }}
          className={cn(
            'leading-none transition-transform hover:scale-110',
            size === 'sm' ? 'text-xs' : 'text-2xl',
            value >= star ? 'opacity-100' : 'opacity-25',
          )}
        >
          ★
        </button>
      ))}
    </div>
  )
}
