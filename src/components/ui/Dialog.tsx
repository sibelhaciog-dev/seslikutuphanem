'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { cn } from '@/lib/cn'

interface DialogProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  /** Başlık şeridinin arka planı — bölümleri birbirinden ayırmak için. */
  headerClassName?: string
  widthClassName?: string
  footer?: ReactNode
}

/**
 * Yerel `<dialog>` öğesini kullanır: odak tuzağı, Escape ile kapatma ve
 * arka plan etkileşiminin engellenmesi tarayıcıdan hazır gelir.
 */
export function Dialog({
  open,
  onClose,
  title,
  subtitle,
  children,
  headerClassName,
  widthClassName = 'max-w-lg',
  footer,
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    if (open && !element.open) element.showModal()
    if (!open && element.open) element.close()
  }, [open])

  useEffect(() => {
    if (!open) return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [open])

  return (
    <dialog
      ref={ref}
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className={cn(
        'w-full rounded-3xl bg-white p-0 shadow-dialog backdrop:bg-black/55 backdrop:backdrop-blur-sm',
        'm-auto max-h-[92vh] overflow-hidden',
        widthClassName,
      )}
      aria-labelledby="dialog-title"
    >
      {open && (
        <div className="flex max-h-[92vh] flex-col">
          <header
            className={cn(
              'flex shrink-0 items-center justify-between gap-3 px-5 py-4',
              headerClassName ?? 'border-b border-line bg-white',
            )}
          >
            <div className="min-w-0">
              <h2
                id="dialog-title"
                className={cn('truncate text-lg', headerClassName ? 'text-white' : 'text-ink')}
              >
                {title}
              </h2>
              {subtitle && (
                <p
                  className={cn(
                    'mt-0.5 truncate text-xs',
                    headerClassName ? 'text-white/75' : 'text-muted',
                  )}
                >
                  {subtitle}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className={cn(
                'flex size-8 shrink-0 items-center justify-center rounded-full text-base transition-colors',
                headerClassName
                  ? 'bg-white/20 text-white hover:bg-white/30'
                  : 'border-[1.5px] border-line text-muted hover:bg-ink hover:text-white',
              )}
            >
              ✕
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

          {footer && (
            <footer className="shrink-0 border-t border-line px-5 py-3.5">{footer}</footer>
          )}
        </div>
      )}
    </dialog>
  )
}
