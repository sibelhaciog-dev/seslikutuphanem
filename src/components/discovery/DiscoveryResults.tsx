import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { RecommendationPick } from '@/lib/data/discovery'

/**
 * Öneri kartları.
 *
 * Gerekçe her kartın ana metni: kullanıcının "neden bu kitap" sorusunun
 * cevabı burada. Kitap adı bağlantı, gerekçe altında.
 */
export function DiscoveryResults({
  picks,
  source,
  note,
  compact = false,
}: {
  picks: RecommendationPick[]
  source: 'ai' | 'deterministik'
  note?: string | null
  compact?: boolean
}) {
  if (picks.length === 0) return null

  return (
    <div>
      {note && (
        <p className="mb-3 rounded-xl border border-line bg-cream px-3 py-2 text-xs text-muted">
          {note}
        </p>
      )}

      <ul className={cn('flex flex-col', compact ? 'gap-2' : 'gap-2.5')}>
        {picks.map((pick) => (
          <li
            key={pick.kitapId || pick.slug}
            className="rounded-xl border border-line bg-white p-3 transition-colors hover:border-accent"
          >
            <Link href={`/kitap/${pick.slug}`} className="block">
              <p className={cn('font-semibold text-ink', compact ? 'text-sm' : 'text-[15px]')}>
                {pick.baslik}
              </p>
              {pick.gerekce && (
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">{pick.gerekce}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {/* Kullanıcı önerinin nereden geldiğini bilmeli. */}
      <p className="mt-2.5 text-[11px] text-muted">
        {source === 'ai'
          ? '✨ Yapay zekâ, yaşına uygun kitaplar arasından seçti.'
          : '📋 Okuma geçmişine göre sıralandı.'}
      </p>
    </div>
  )
}
