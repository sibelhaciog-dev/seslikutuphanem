'use client'

import { useState } from 'react'
import { useAppData } from '@/components/providers/AppDataProvider'
import { cn } from '@/lib/cn'

interface GuidePanelProps {
  value: string | null
  onChange: (topicSlug: string | null) => void
}

/** Sol menüdeki gelişim rehberleri — taksonomi veritabanından gelir. */
export function GuidePanel({ value, onChange }: GuidePanelProps) {
  const { taxonomy } = useAppData()
  const initialArea =
    taxonomy.areas.find((area) => area.topics.some((topic) => topic.slug === value))?.slug ?? null
  const [openArea, setOpenArea] = useState<string | null>(initialArea)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen((open) => !open)}
        aria-expanded={mobileOpen}
        className="mb-2 flex w-full items-center justify-between rounded-xl border-2 border-accent bg-white px-4 py-3 text-base font-extrabold text-ink lg:hidden"
      >
        <span>📖 Gelişim rehberleri</span>
        <span aria-hidden>{mobileOpen ? '⌄' : '›'}</span>
      </button>

      <aside
        className={cn(
          'w-full shrink-0 overflow-hidden rounded-panel border border-line bg-white lg:sticky lg:top-4 lg:block lg:w-56',
          mobileOpen ? 'block' : 'hidden',
        )}
        aria-label="Gelişim rehberleri"
      >
        <h2 className="border-b-2 border-accent px-4 pt-4 pb-3 text-base font-extrabold tracking-tight text-ink">
          Rehberler
        </h2>

        {taxonomy.areas.map((area) => {
          const expanded = openArea === area.slug
          const activeInArea = area.topics.some((topic) => topic.slug === value)
          return (
            <div key={area.slug} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => setOpenArea(expanded ? null : area.slug)}
                aria-expanded={expanded}
                className={cn(
                  'flex w-full items-center justify-between px-4 py-3 text-left text-sm font-bold transition-colors hover:bg-cream',
                  activeInArea ? 'text-accent' : 'text-ink',
                )}
              >
                <span>
                  {area.emoji} {area.name.replace(' Rehberi', '')}
                </span>
                <span aria-hidden>{expanded ? '⌄' : '›'}</span>
              </button>

              {expanded && (
                <div className="pb-2">
                  {area.topics.map((topic) => {
                    const selected = value === topic.slug
                    return (
                      <button
                        key={topic.slug}
                        type="button"
                        onClick={() => onChange(selected ? null : topic.slug)}
                        aria-pressed={selected}
                        className={cn(
                          'block w-full py-1.5 pr-4 pl-8 text-left text-xs transition-colors',
                          selected
                            ? 'bg-accent-soft font-semibold text-accent'
                            : 'text-ink-soft hover:bg-accent-soft hover:text-accent',
                        )}
                      >
                        {topic.label ?? topic.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="w-full border-t border-line px-4 py-2.5 text-left text-xs text-muted transition-colors hover:text-accent"
          >
            ✕ Filtreyi temizle
          </button>
        )}
      </aside>
    </>
  )
}
