# ADR 0002 — Katalog: içerik depoda, çalışma zamanı veritabanında

**Durum:** Kabul edildi · **Tarih:** 2026-08-20

## Bağlam

196 kitaplık katalog v1'de `src/data/books.json` içindeydi ve tümü istemci
paketine gömülüyordu. Bu; anında filtreleme sağlıyordu ama:

- Kitap eklemek için yeniden yayın (deploy) gerekiyordu.
- Yazar, yayınevi, seri gibi ilişkiler modellenemiyordu.
- Gerçek bir arama (tam metin, Türkçe) yapılamıyordu.
- Katalog büyüdükçe istemci paketi büyüyordu.

Öte yandan içerik sahibi kitapları bir yönetim panelinden değil, asistana
"şu kitabı ekle" diyerek ekliyor.

## Karar

İki katmanlı yaklaşım:

1. **Yazım kaynağı depoda.** `content/books.json`, `content/taxonomy.json`,
   `content/achievements.json`, `content/organizations.json` — sürüm kontrollü,
   incelenebilir, Zod ile doğrulanır.
2. **Çalışma zamanı kaynağı veritabanında.** `npm run db:sync` içerik
   dosyalarını Supabase'e idempotent biçimde yazar (slug üzerinden upsert).
   Uygulama her zaman veritabanından okur.

Editör arayüzünden yapılan değişiklikler doğrudan veritabanına yazar; bu
değişiklikler `npm run content:pull` ile depoya geri alınabilir.

## Alternatifler

| Seçenek                         | Neden seçilmedi                                                                               |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| Yalnızca JSON (v1 gibi)         | İlişkiler, arama ve yönetim arayüzü mümkün değil                                              |
| Yalnızca veritabanı             | İçerik sürüm kontrolünden çıkar; hatalı bir düzenleme geri alınamaz, kod incelemesi yapılamaz |
| Harici CMS (Sanity, Contentful) | Ek servis, ek maliyet, ek öğrenme yükü; ürünün ölçeği bunu haklı çıkarmıyor                   |

## Sonuçlar

- İki kaynak arasında sapma riski var. `npm run content:validate` ve senkronda
  slug bazlı upsert bunu sınırlar; sapma çıkarsa depo kazanır.
- Katalog sayfası artık veritabanına bağlı. Sunucu tarafında önbelleklenir
  (`revalidate` + etiketli geçersiz kılma), böylece her istek veritabanına
  gitmez.
- Ana sayfada anında filtreleme korunur: sunucu, kataloğun kompakt bir
  izdüşümünü (yaklaşık 60 KB) bir kez gönderir, filtreleme istemcide çalışır.
