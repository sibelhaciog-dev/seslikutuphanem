-- ═══════════════════════════════════════════════════════════════════════════
-- 0021 — Kota sayacına keşif önerisini ekle
--
-- SORUN: `ai_usage_events.feature` kısıtı yalnızca `cover_scan` ve
-- `report_note` değerlerine izin veriyordu. Kodda yeni bir kota kalemi
-- (`recommendation`, ADR 0007) eklenince her kullanım kaydı bu kısıta takıldı.
--
-- Görünmemesinin sebebi: `recordUsage()` dönen hatayı hiç okumuyordu. Uç 200
-- dönüyor, öneri çalışıyor, ama kullanım HİÇ kaydedilmiyordu — dolayısıyla
-- `ai_quota_remaining()` her zaman tam hak döndürüyor ve günlük sınır
-- fiilen uygulanmıyordu. Yani sessiz bir maliyet açığı.
--
-- Canlıda 4 başarılı öneri üretildi, `ai_usage_events`'te karşılığı 0 satır.
--
-- İki taraf da düzeltildi: kısıt genişletildi ve `recordUsage()` artık
-- başarısızlığı günlüğe yazıyor (istek düşürülmüyor — yapay zekâ çağrısı
-- zaten yapılmış olduğu için isteği reddetmek hiçbir şeyi geri almaz).
--
-- DİKKAT: `AI_QUOTAS` (src/lib/ai/config.ts) ile bu liste birlikte
-- güncellenmeli. Şema testi ikisinin de aynı üç değeri taşıdığını doğruluyor.
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.ai_usage_events
  drop constraint if exists ai_usage_events_feature_check;

alter table public.ai_usage_events
  add constraint ai_usage_events_feature_check
  check (feature in ('cover_scan', 'report_note', 'recommendation'));
