# Yol Haritası ve Görev Listesi

> Bu dosya çalışan kontrol listesidir. Bir görev bitince kutusu işaretlenir ve
> ilgili doküman güncellenir. Yeni iş çıkarsa buraya eklenir.

**Durum:** v2 — veri modeli yeniden tasarımı
**Dal:** `feat/product-v2`
**Son güncelleme:** 2026-08-20 (v2 tamamlandı)

---

## Faz 0 — Karar ve dokümantasyon zemini

- [x] `docs/` dizini ve yapısı
- [x] PRD (ürün gereksinimleri)
- [x] Yol haritası / kontrol listesi (bu dosya)
- [x] ADR 0001 — Neden Next.js + Supabase
- [x] ADR 0002 — Katalog kaynağı: içerik depoda, çalışma zamanı veritabanında
- [x] ADR 0003 — OpenAI uyumlu tek yapay zekâ arayüzü (OpenRouter)
- [x] ADR 0004 — Kütüphane modeli: durum + oturum kaydı
- [x] ADR 0005 — Veritabanı adlandırma ve enum dili
- [x] Mimari dokümanı + diyagramlar
- [x] Veri modeli dokümanı + ER diyagramı

## Faz 1 — Veritabanı (sıfırdan, yeni Supabase projesi)

- [x] `0001` uzantılar, yardımcı fonksiyonlar, enum'lar
- [x] `0002` taksonomi (gelişim alanları, konular, ilgi alanları)
- [x] `0003` katalog (kitaplar, kişiler, yayınevleri, seriler, ilişkiler)
- [x] `0004` hesaplar (profiller, roller, çocuklar)
- [x] `0005` kütüphane (kayıtlar, okuma oturumları, notlar, başarımlar)
- [x] `0006` topluluk (geri bildirim, takas, bağış)
- [x] `0007` depolama kovaları ve politikaları
- [x] Tüm tablolarda RLS + politika testleri
- [x] Docker + Postgres 16 üzerinde uçtan uca doğrulama
- [x] Kullanıcı silme zinciri ve tetikleyici yetkileri (`0012`)
- [x] Rol izinleri (`0011_grants.sql`) — RLS'ten ayrı katman
- [x] Gerçek Supabase yığınında doğrulama (Postgres 17 + PostgREST + Auth)

## Faz 2 — İçerik formatı v2

- [x] `content/taxonomy.json` — alanlar, konular, ilgi alanları
- [x] `content/achievements.json` — başarımlar
- [x] `content/organizations.json` — bağış kurumları
- [x] `content/books.json` — 196 kitap, zenginleştirilmiş şema
- [x] Eski `src/data/books.json` → v2 dönüştürücü
- [x] Zod şemaları + `npm run content:validate`
- [~] Yazar/çizer ayrıştırma — **yapılmadı**: 196 özetin yalnızca 5'inde
  `@hesap` var ve bunlar yazar/çizer/yayınevi karışık. Şema hazır,
  veri zamanla elle girilecek.

## Faz 3 — Senkronizasyon ve tohumlama

- [x] `npm run db:sync` — içerik → Supabase (idempotent upsert)
- [x] Otomatik konu etiketleme (anahtar kelimelerden)
- [~] Ayrı SQL tohum dosyası — **gerekmedi**: `DATABASE_URL` ile
  `npm run db:sync` doğrudan çalışıyor, ikinci bir yol gereksiz.
- [x] Yerel Postgres üzerinde tohumlama doğrulaması

## Faz 4 — Yapay zekâ katmanı (OpenAI uyumlu)

- [x] `@anthropic-ai/sdk` kaldırıldı, `openai` eklendi
- [x] `AI_BASE_URL` / `AI_API_KEY` / `AI_TEXT_MODEL` / `AI_VISION_MODEL`
- [x] Ortak istemci + JSON şema doğrulamalı yanıt ayrıştırma
- [x] Görsel: kitap kapağı tanıma (`/api/kapak-tani`)
- [x] Metin: okuma raporu yorumu (`/api/rapor-yorumu`)
- [x] Hız sınırı ve kimlik doğrulama koruması
- [x] Anahtar yokken zarif devre dışı kalma

## Faz 5 — Uygulama katmanı

- [x] Veritabanı tipleri (`database.types.ts`) yeni şemaya göre
- [x] Veri erişim katmanı (`src/lib/data/*`) — sorgular tek yerde
- [x] Katalog artık veritabanından (önbellekli), taksonomi dahil
- [x] Kütüphane: durum (okunacak/okunuyor/okundu/yarım) + favori + puan
- [x] Okuma oturumları — bir kitap birden çok kez okunabilir
- [x] Başarımlar ve puan sistemi
- [x] Kendi eklediğin kitaplar (kamera/manuel) katalogdan ayrı
- [x] Arama: Postgres tam metin araması (Türkçe)
- [x] Yönetici arayüzü (kitap ve geri bildirim yönetimi)

## Faz 6 — Kalite

- [x] Birim testleri (iş mantığı)
- [x] Şema/politika testleri (Docker + Postgres)
- [x] CI güncellendi
- [x] `npm run check` yeşil
- [x] Uçtan uca test (`npm run test:e2e`) — gerçek auth + RLS + tetikleyiciler
- [x] Mobil kontrolü (390 px: yatay taşma yok, sayfa genişliği doğru)

## Faz 7 — Erişim geldiğinde (bekleyen)

- [ ] Yeni Supabase projesinde migration'ları çalıştır (0001 → 0012, sırayla)
- [ ] `npm run db:sync` ile kataloğu yükle
- [ ] Auth akışlarını uçtan uca dene (kayıt → doğrulama → onboarding)
- [ ] Vercel'e bağla, ortam değişkenlerini gir
- [ ] Supabase Redirect URL listesine üretim adresini ekle
- [ ] Depolama kovalarını ve boyut sınırlarını doğrula

## Sonraki sürüm için fikirler (kapsam dışı)

- Ebeveynler arası kitap kulübü / paylaşılan listeler
- Okul ve sınıf hesapları
- Çocuk için basitleştirilmiş "kendi kütüphanem" görünümü
- Kitap ödünç verme takibi
- E-posta ile aylık rapor
