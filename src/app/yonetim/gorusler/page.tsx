import { AdminFeedbackList } from '@/components/admin/AdminFeedbackList'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function AdminFeedbackPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('feedback')
    .select('id, topic, message, status, staff_note, created_at')
    .order('created_at', { ascending: false })
    .limit(200)

  return <AdminFeedbackList items={data ?? []} />
}
