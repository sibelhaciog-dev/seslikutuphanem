'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'
import { formatShortDate } from '@/lib/dates'
import { FEEDBACK_TOPIC_LABELS } from '@/lib/labels'
import { createClient } from '@/lib/supabase/client'

interface FeedbackItem {
  id: string
  topic: 'feature' | 'bug' | 'book' | 'general'
  message: string
  status: 'new' | 'in_review' | 'resolved' | 'wont_fix'
  staff_note: string | null
  created_at: string
}

const STATUS_LABELS: Record<FeedbackItem['status'], string> = {
  new: 'Yeni',
  in_review: 'İnceleniyor',
  resolved: 'Çözüldü',
  wont_fix: 'Yapılmayacak',
}

const STATUS_ORDER: FeedbackItem['status'][] = ['new', 'in_review', 'resolved', 'wont_fix']

export function AdminFeedbackList({ items }: { items: FeedbackItem[] }) {
  const router = useRouter()
  const toast = useToast()
  const [pending, setPending] = useState<string | null>(null)

  async function updateStatus(id: string, status: FeedbackItem['status']) {
    setPending(id)
    const { error } = await createClient().from('feedback').update({ status }).eq('id', id)
    setPending(null)
    if (error) {
      toast.show('Güncellenemedi.', 'error')
      return
    }
    router.refresh()
  }

  if (items.length === 0) {
    return <EmptyState icon="💬" title="Henüz görüş yok" />
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.id} className="rounded-panel border border-line bg-white p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">
              {FEEDBACK_TOPIC_LABELS[item.topic] ?? item.topic}
            </span>
            <span className="text-[11px] text-muted">
              {formatShortDate(item.created_at)}
            </span>
          </div>

          <p className="mb-3 text-sm leading-relaxed whitespace-pre-wrap text-ink-soft">
            {item.message}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {STATUS_ORDER.map((status) => (
              <button
                key={status}
                type="button"
                disabled={pending === item.id}
                onClick={() => void updateStatus(item.id, status)}
                aria-pressed={item.status === status}
                className={cn(
                  'rounded-full border-[1.5px] px-3 py-1 text-[11px] font-semibold transition-colors',
                  item.status === status
                    ? 'border-accent bg-accent text-white'
                    : 'border-line text-muted hover:border-accent hover:text-accent',
                )}
              >
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}
