'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        icon="🌧️"
        title="Bir şeyler ters gitti"
        description="Sayfa yüklenirken beklenmedik bir hata oluştu. Tekrar denemek genellikle işe yarar."
        action={<Button onClick={reset}>Tekrar dene</Button>}
      />
    </div>
  )
}
