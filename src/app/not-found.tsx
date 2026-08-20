import { ButtonLink } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-20">
      <EmptyState
        icon="🧭"
        title="Bu sayfayı bulamadık"
        description="Aradığınız sayfa taşınmış veya hiç var olmamış olabilir."
        action={<ButtonLink href="/">Kitaplara dön</ButtonLink>}
      />
    </div>
  )
}
