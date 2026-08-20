import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon: string
  title: string
  description?: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="col-span-full py-14 text-center">
      <div className="mb-3 text-5xl" aria-hidden>
        {icon}
      </div>
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{description}</p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  )
}
