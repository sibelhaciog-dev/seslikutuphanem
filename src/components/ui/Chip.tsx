'use client'

import { cn } from '@/lib/cn'

interface ChipProps {
  active: boolean
  onClick: () => void
  children: React.ReactNode
  className?: string
}

export function Chip({ active, onClick, children, className }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'shrink-0 rounded-full border-[1.5px] px-3.5 py-1 text-[13px] font-medium whitespace-nowrap transition-colors',
        active
          ? 'border-accent bg-accent text-white'
          : 'border-line text-ink-soft hover:border-accent hover:text-accent',
        className,
      )}
    >
      {children}
    </button>
  )
}
