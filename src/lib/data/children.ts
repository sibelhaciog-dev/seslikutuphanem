import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import type { Gender } from './types'

type Client = SupabaseClient<Database>

/** Çocuk profili formunun taşıdığı değerler. */
export interface ChildFormValues {
  name: string
  birthDate: string
  gender: Gender
  interestSlugs: string[]
  focusTopicSlugs: string[]
}

export function emptyChildForm(): ChildFormValues {
  return { name: '', birthDate: '', gender: 'unspecified', interestSlugs: [], focusTopicSlugs: [] }
}

/** Cinsiyete göre varsayılan avatar karakteri. */
function defaultCharacter(gender: Gender): string {
  return gender === 'boy' ? 'k4' : 'k1'
}

async function resolveIds(
  supabase: Client,
  table: 'interests' | 'development_topics',
  slugs: string[],
): Promise<string[]> {
  if (slugs.length === 0) return []
  const { data } = await supabase.from(table).select('id, slug').in('slug', slugs)
  return (data ?? []).map((row) => row.id)
}

async function replaceRelations(
  supabase: Client,
  childId: string,
  values: ChildFormValues,
): Promise<void> {
  const [interestIds, topicIds] = await Promise.all([
    resolveIds(supabase, 'interests', values.interestSlugs),
    resolveIds(supabase, 'development_topics', values.focusTopicSlugs),
  ])

  await supabase.from('child_interests').delete().eq('child_id', childId)
  if (interestIds.length > 0) {
    await supabase
      .from('child_interests')
      .insert(interestIds.map((interestId) => ({ child_id: childId, interest_id: interestId })))
  }

  await supabase.from('child_focus_topics').delete().eq('child_id', childId)
  if (topicIds.length > 0) {
    await supabase
      .from('child_focus_topics')
      .insert(topicIds.map((topicId) => ({ child_id: childId, topic_id: topicId })))
  }
}

export async function createChild(
  supabase: Client,
  userId: string,
  values: ChildFormValues,
  position: number,
): Promise<string> {
  const { data, error } = await supabase
    .from('children')
    .insert({
      owner_id: userId,
      name: values.name.trim(),
      birth_date: values.birthDate || null,
      gender: values.gender,
      avatar_character: defaultCharacter(values.gender),
      position,
    })
    .select('id')
    .single()

  if (error || !data) throw error ?? new Error('Profil oluşturulamadı.')
  await replaceRelations(supabase, data.id, values)
  return data.id
}

export async function updateChild(
  supabase: Client,
  childId: string,
  values: ChildFormValues,
): Promise<void> {
  const { error } = await supabase
    .from('children')
    .update({
      name: values.name.trim(),
      birth_date: values.birthDate || null,
      gender: values.gender,
    })
    .eq('id', childId)

  if (error) throw error
  await replaceRelations(supabase, childId, values)
}

export async function saveAvatar(
  supabase: Client,
  childId: string,
  characterId: string,
  accessories: string[],
): Promise<void> {
  const { error } = await supabase
    .from('children')
    .update({ avatar_character: characterId, avatar_accessories: accessories })
    .eq('id', childId)
  if (error) throw error
}

/** Silmek yerine arşivler: okuma geçmişi kaybolmasın. */
export async function archiveChild(supabase: Client, childId: string): Promise<void> {
  const { error } = await supabase
    .from('children')
    .update({ archived_at: new Date().toISOString() })
    .eq('id', childId)
  if (error) throw error
}

export async function completeOnboarding(supabase: Client, userId: string): Promise<void> {
  await supabase
    .from('profiles')
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq('id', userId)
}
