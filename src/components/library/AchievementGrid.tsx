'use client'

import { useAppData } from '@/components/providers/AppDataProvider'
import { EmptyState } from '@/components/ui/EmptyState'
import { cn } from '@/lib/cn'
import { formatShortDate } from '@/lib/dates'

/** Kazanılan ve henüz kilitli başarımlar. */
export function AchievementGrid() {
  const { achievements, points } = useAppData()

  if (achievements.length === 0) {
    return <EmptyState icon="🏅" title="Başarımlar yükleniyor…" />
  }

  const earned = achievements.filter((achievement) => achievement.earnedAt)

  return (
    <div>
      <p className="mb-4 text-sm text-muted">
        <strong className="text-ink">{earned.length}</strong> / {achievements.length} başarım
        kazanıldı · ⭐ {points} puan
      </p>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {achievements.map((achievement) => {
          const unlocked = Boolean(achievement.earnedAt)
          return (
            <li
              key={achievement.slug}
              className={cn(
                'rounded-panel border p-4 text-center transition-colors',
                unlocked ? 'border-accent bg-accent-soft' : 'border-line bg-white opacity-60',
              )}
            >
              <span className={cn('block text-3xl', !unlocked && 'grayscale')} aria-hidden>
                {unlocked ? achievement.emoji : '🔒'}
              </span>
              <p className="mt-2 text-[13px] font-bold text-ink">{achievement.name}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted">{achievement.description}</p>
              {unlocked && achievement.earnedAt && (
                <p className="mt-1.5 text-[10px] font-semibold text-accent">
                  {formatShortDate(achievement.earnedAt)} · +
                  {achievement.points} puan
                </p>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
