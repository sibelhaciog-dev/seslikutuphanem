import { AdminBookList } from '@/components/admin/AdminBookList'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<{ ara?: string; durum?: string }>
}

export default async function AdminBooksPage({ searchParams }: PageProps) {
  const { ara = '', durum = '' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('books')
    .select('id, slug, title, summary, language, age_min, age_max, status, posted_at, like_count')
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(100)

  if (durum === 'draft' || durum === 'published' || durum === 'archived') {
    query = query.eq('status', durum)
  }

  // Postgres tam metin araması: Türkçe önek eşleştirmesi (bkz. 0001 migration).
  if (ara.trim()) {
    const { data: matches } = await supabase.rpc('build_search_query', { input: ara })
    if (matches)
      query = query.textSearch('search_vector', ara, { config: 'search_tr', type: 'websearch' })
  }

  const { data, error } = await query

  return (
    <AdminBookList books={data ?? []} query={ara} status={durum} error={error?.message ?? null} />
  )
}
