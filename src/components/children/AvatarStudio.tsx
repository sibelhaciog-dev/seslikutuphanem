'use client'

import { useState } from 'react'
import { AvatarFigure } from '@/components/avatar/AvatarFigure'
import { useAppData } from '@/components/providers/AppDataProvider'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { useToast } from '@/components/ui/Toast'
import { AVATAR_ACCESSORIES, AVATAR_CHARACTERS, canAfford, spentPoints } from '@/lib/avatar'
import { saveAvatar } from '@/lib/data/children'
import { cn } from '@/lib/cn'
import { createClient } from '@/lib/supabase/client'
import type { Child } from '@/lib/data/types'

interface AvatarStudioProps {
  child: Child
  points: number
  onClose: () => void
}

/**
 * Avatar atölyesi. Karakterler ücretsiz; aksesuarlar puanlanan her kitaptan
 * kazanılan yıldız puanıyla açılır.
 */
export function AvatarStudio({ child, points, onClose }: AvatarStudioProps) {
  const { refreshChildren } = useAppData()
  const toast = useToast()
  const [character, setCharacter] = useState(child.avatarCharacter)
  const [accessories, setAccessories] = useState<string[]>(child.avatarAccessories)
  const [busy, setBusy] = useState(false)

  const spent = spentPoints(accessories)

  function toggle(id: string) {
    setAccessories((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  async function save() {
    setBusy(true)
    try {
      await saveAvatar(createClient(), child.id, character, accessories)
      await refreshChildren()
      toast.show('Avatar kaydedildi.')
      onClose()
    } catch {
      toast.show('Avatar kaydedilemedi.', 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`${child.name} için avatar`}
      subtitle={`⭐ ${points} puan · ${spent} puan kullanıldı`}
      headerClassName="bg-linear-[135deg,#6a0dad,#c040e0,#ff6eb4]"
      footer={
        <div className="flex justify-end">
          <Button onClick={() => void save()} disabled={busy}>
            {busy ? 'Kaydediliyor…' : 'Kaydet ✓'}
          </Button>
        </div>
      }
    >
      <div className="mb-5 flex justify-center rounded-2xl bg-linear-[160deg,#f0e8ff,#e8f4ff] py-5">
        <AvatarFigure characterId={character} accessories={accessories} size={160} />
      </div>

      <section className="mb-5">
        <h3 className="mb-2.5 text-[11px] font-bold tracking-wider text-muted uppercase">
          Karakter seç
        </h3>
        <div className="flex flex-wrap gap-2">
          {AVATAR_CHARACTERS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setCharacter(option.id)}
              aria-pressed={character === option.id}
              title={option.name}
              className={cn(
                'overflow-hidden rounded-xl border-2 p-0.5 transition-colors',
                character === option.id
                  ? 'border-accent bg-accent-soft'
                  : 'border-line hover:border-accent',
              )}
            >
              <AvatarFigure characterId={option.id} headOnly size={48} />
            </button>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1 text-[11px] font-bold tracking-wider text-muted uppercase">
          Aksesuarlar
        </h3>
        <p className="mb-2.5 text-xs text-muted">
          Puanladığın her kitap 1 yıldız puanı kazandırır.
        </p>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {AVATAR_ACCESSORIES.map((accessory) => {
            const selected = accessories.includes(accessory.id)
            const affordable = canAfford(accessories, accessory, points)
            return (
              <button
                key={accessory.id}
                type="button"
                disabled={!affordable}
                onClick={() => toggle(accessory.id)}
                aria-pressed={selected}
                className={cn(
                  'rounded-xl border-2 p-2 text-center transition-transform',
                  selected
                    ? 'border-accent bg-accent-soft'
                    : affordable
                      ? 'border-line hover:scale-105 hover:border-accent'
                      : 'cursor-not-allowed border-line opacity-40',
                )}
              >
                <span className="block text-2xl" aria-hidden>
                  {accessory.emoji}
                </span>
                <span className="mt-1 block text-[11px] font-medium text-ink">
                  {accessory.name}
                </span>
                <span className="block text-[10px] text-muted">
                  {affordable || selected ? `${accessory.cost} ⭐` : `🔒 ${accessory.cost} ⭐`}
                </span>
              </button>
            )
          })}
        </div>
      </section>
    </Dialog>
  )
}
