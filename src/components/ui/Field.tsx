import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '@/lib/cn'

const CONTROL =
  'w-full rounded-xl border-[1.5px] border-line bg-white px-3.5 py-2.5 text-sm text-ink outline-none transition-colors focus:border-accent disabled:opacity-60'

const LABEL = 'mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-muted'

interface BaseProps {
  label: string
  hint?: string
  error?: string
}

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  return (
    <div className="mb-3.5">
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className={cn(CONTROL, error && 'border-danger', className)}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint || error ? `${id}-hint` : undefined}
        {...props}
      />
      {(hint || error) && (
        <p id={`${id}-hint`} className={cn('mt-1 text-xs', error ? 'text-danger' : 'text-muted')}>
          {error ?? hint}
        </p>
      )}
    </div>
  )
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: BaseProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId()
  return (
    <div className="mb-3.5">
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <select id={id} className={cn(CONTROL, error && 'border-danger', className)} {...props}>
        {children}
      </select>
      {(hint || error) && (
        <p className={cn('mt-1 text-xs', error ? 'text-danger' : 'text-muted')}>{error ?? hint}</p>
      )}
    </div>
  )
}

export function TextAreaField({
  label,
  hint,
  error,
  className,
  ...props
}: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId()
  return (
    <div className="mb-3.5">
      <label className={LABEL} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={cn(CONTROL, 'resize-y', error && 'border-danger', className)}
        {...props}
      />
      {(hint || error) && (
        <p className={cn('mt-1 text-xs', error ? 'text-danger' : 'text-muted')}>{error ?? hint}</p>
      )}
    </div>
  )
}

export function FormMessage({ tone, children }: { tone: 'error' | 'success'; children: string }) {
  if (!children) return null
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'mb-3.5 rounded-xl border-[1.5px] px-3.5 py-2.5 text-sm',
        tone === 'error'
          ? 'border-[#ffb0b0] bg-danger-soft text-danger'
          : 'border-[#86efac] bg-[#f0fff4] text-[#16a34a]',
      )}
    >
      {children}
    </p>
  )
}
