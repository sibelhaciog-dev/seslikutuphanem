import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'

/**
 * Keşif modları (ADR 0007, 0020).
 *
 * Modlar ve eğilimleri veritabanında; yönetim arayüzünden düzenlenebiliyor.
 * Bu yüzden kodda sabit bir liste YOK — yeni bir mod eklemek yayın
 * gerektirmiyor.
 */

type Client = SupabaseClient<Database>

export interface ModeWeight {
  slug: string
  weight: number
}

export interface DiscoveryMode {
  id: string
  slug: string
  name: string
  emoji: string | null
  description: string | null
  promptHint: string | null
  language: 'tr' | 'en' | null
  topics: ModeWeight[]
  interests: ModeWeight[]
}

/** `discovery_mode_details` görünümündeki jsonb dizisini güvenle okur. */
function readWeights(value: unknown): ModeWeight[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== 'object') return []
    const { slug, weight } = entry as { slug?: unknown; weight?: unknown }
    if (typeof slug !== 'string') return []
    return [{ slug, weight: typeof weight === 'number' ? weight : 3 }]
  })
}

function toMode(row: Record<string, unknown>): DiscoveryMode {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    emoji: (row.emoji as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    promptHint: (row.prompt_hint as string | null) ?? null,
    language: (row.language as DiscoveryMode['language']) ?? null,
    topics: readWeights(row.topics),
    interests: readWeights(row.interests),
  }
}

/** Arayüzde gösterilecek aktif modlar, sıralı. */
export async function loadDiscoveryModes(supabase: Client): Promise<DiscoveryMode[]> {
  const { data, error } = await supabase
    .from('discovery_mode_details')
    .select('*')
    .eq('is_active', true)
    .order('position')

  if (error) throw new Error(`Keşif modları okunamadı: ${error.message}`)
  return (data ?? []).map((row) => toMode(row as Record<string, unknown>))
}

/** Tek mod — uç noktada eğilimleri uygulamak için. */
export async function loadDiscoveryMode(
  supabase: Client,
  slug: string,
): Promise<DiscoveryMode | null> {
  const { data, error } = await supabase
    .from('discovery_mode_details')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error) throw new Error(`Keşif modu okunamadı: ${error.message}`)
  return data ? toMode(data as Record<string, unknown>) : null
}

/** `candidatePool` için ağırlık sözlüğüne çevirir. */
export function toWeightRecord(weights: ModeWeight[]): Record<string, number> {
  return Object.fromEntries(weights.map((entry) => [entry.slug, entry.weight]))
}
