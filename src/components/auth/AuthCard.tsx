import type { ReactNode } from 'react'
import Link from 'next/link'

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-[80dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-line bg-white p-8 shadow-dialog">
        <div className="mb-6 text-center">
          <Link
            href="/"
            className="mx-auto mb-2.5 flex size-14 items-center justify-center rounded-2xl bg-accent text-3xl"
            aria-label="Ana sayfa"
          >
            📚
          </Link>
          <h1 className="text-2xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {children}
        {footer && <div className="mt-5 text-center text-sm text-muted">{footer}</div>}
      </div>
    </div>
  )
}
