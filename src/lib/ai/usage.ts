import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { AI_QUOTAS, type AiFeature } from './config'

/**
 * Kullanıcı başına kota kontrolü ve kullanım kaydı.
 * Kota veritabanından hesaplanır; sunucusuz ortamda bellekte tutulamaz.
 */

export async function remainingQuota(
  supabase: SupabaseClient<Database>,
  feature: AiFeature,
): Promise<number> {
  const quota = AI_QUOTAS[feature]
  const { data, error } = await supabase.rpc('ai_quota_remaining', {
    target_feature: feature,
    window_hours: quota.windowHours,
    quota: quota.limit,
  })
  // Kota sorgusu başarısızsa özelliği kapatmak yerine geçişe izin veriyoruz;
  // asıl maliyet koruması sağlayıcı tarafındaki limitlerde.
  if (error) return quota.limit
  return data ?? 0
}

export async function recordUsage(
  supabase: SupabaseClient<Database>,
  input: {
    userId: string
    feature: AiFeature
    model?: string
    totalTokens?: number
    succeeded: boolean
  },
): Promise<void> {
  const { error } = await supabase.from('ai_usage_events').insert({
    user_id: input.userId,
    feature: input.feature,
    model: input.model ?? null,
    total_tokens: input.totalTokens ?? null,
    succeeded: input.succeeded,
  })

  // İstek DÜŞÜRÜLMÜYOR: yapay zekâ çağrısı zaten yapıldı, isteği reddetmek
  // hiçbir şeyi geri almaz. Ama sessiz kalmak da olmaz — bu yazma başarısız
  // olursa kota fiilen uygulanmaz. Bir kez böyle oldu: `feature` kısıtı yeni
  // kalemi tanımıyordu ve hata yutulduğu için haftalarca görünmeyebilirdi
  // (bkz. 0021).
  if (error) {
    console.error(`ai_usage_events yazılamadı (${input.feature}): ${error.message}`)
  }
}
