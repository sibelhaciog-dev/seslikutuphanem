-- ═══════════════════════════════════════════════════════════════════════════
-- 0016 — Çocuk doğum tarihi kısıtını gevşet
--
-- SORUN: Kısıt `birth_date > '2000-01-01'` idi. Form ise `min="2005-01-01"`
-- kullanıyordu — yani iki katman iki farklı kural söylüyordu. Üstelik form
-- `noValidate` olduğu için hiçbir sınır uygulanmıyor, geçersiz tarih
-- veritabanına gidiyor ve kullanıcı ham Postgres hatası görüyordu.
--
-- KARAR: Ürün kuralı (çocuk en fazla 18 yaşında olabilir) FORMDA yaşıyor,
-- burada değil. Sebebi: `current_date - interval '18 years'` biçiminde bir
-- kısıt zamanla kayar. Bugün 17 yaşındaki bir çocuk için açılmış satır,
-- çocuk 19 olunca kısıta aykırı hale gelir; ebeveyn adı düzeltmek için
-- UPDATE yaptığında işlem düşer. CHECK yalnızca yazma anında değerlendiği
-- için satır "sessizce" geçersizleşir ve bunu ancak düzenlemeye çalışınca
-- fark edersiniz. Kullanıcıyı kendi verisinden kilitlemek kabul edilemez.
--
-- Veritabanında yalnızca gerçekten değişmez olan kural kalıyor: kimse
-- gelecekte doğmuş olamaz. Alt sınır ise yazım hatası yakalamak için
-- (1899 gibi) bilinçli olarak çok geniş.
--
-- Doğrulama katmanları:
--   1. `src/lib/validation.ts` — 18 yaş kuralı, anlaşılır Türkçe mesaj
--   2. bu kısıt — mantıksız veriye karşı son savunma
--   3. `src/lib/errors.ts` — 2. katman yine de tetiklenirse Türkçe çeviri
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.children
  drop constraint if exists children_birth_date_check;

alter table public.children
  add constraint children_birth_date_check
  check (birth_date is null or (birth_date > date '1900-01-01' and birth_date <= current_date));
