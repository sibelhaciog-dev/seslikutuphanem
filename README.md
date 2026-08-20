# Sesli Kütüphanem

Çocuk kitapları rehberi. Ebeveynler çocukları için profil oluşturur; uygulama
yaşa, ilgi alanlarına ve öncelikli gelişim konularına göre kitap önerir,
okunanları takip eder ve ilerlemeyi rapora dönüştürür.

[`sesli.kutuphanem`](https://www.instagram.com/sesli.kutuphanem) Instagram
hesabındaki kitap tanıtımlarıyla eşleşen 196 kitaplık bir katalog içerir.

---

## Hızlı başlangıç

```bash
npm install
cp .env.example .env.local   # değerleri doldurun
npm run dev                  # http://localhost:3000
```

Veritabanı kurulumu, ortam değişkenleri ve yayına alma:
**[docs/operations.md](docs/operations.md)**

## Dokümantasyon

| Soru                          | Dosya                                        |
| ----------------------------- | -------------------------------------------- |
| Ürün ne yapıyor, kime, neden? | [docs/prd.md](docs/prd.md)                   |
| Sistem nasıl kurulu?          | [docs/architecture.md](docs/architecture.md) |
| Veritabanında ne var?         | [docs/data-model.md](docs/data-model.md)     |
| Şu karar neden böyle alındı?  | [docs/decisions/](docs/decisions/)           |
| Yapay zekâ nasıl bağlı?       | [docs/ai.md](docs/ai.md)                     |
| Sırada ne var?                | [docs/roadmap.md](docs/roadmap.md)           |

## Yığın

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** — yapılandırma `globals.css` içindeki `@theme` bloğunda
- **Supabase** — kimlik doğrulama, Postgres, depolama; her tabloda RLS
- **OpenAI uyumlu yapay zekâ uç noktası** (varsayılan OpenRouter) — kapak
  tanıma ve rapor yorumu
- **Zod** — içerik dosyaları ve API girdileri
- **Vitest** — iş mantığı · **Docker + Postgres** — şema ve RLS testleri

## Komutlar

| Komut                         | Ne yapar                                  |
| ----------------------------- | ----------------------------------------- |
| `npm run dev`                 | Geliştirme sunucusu                       |
| `npm run build` / `npm start` | Üretim derlemesi / çalıştırma             |
| `npm run check`               | Tip kontrolü + lint + testler             |
| `npm test`                    | Birim testleri                            |
| `npm run db:test`             | Şema ve RLS testleri (Docker gerekir)     |
| `npm run db:local`            | Yerel şemayı kur ve konteyneri açık bırak |
| `npm run db:types`            | Veritabanı tiplerini şemadan üret         |
| `npm run db:sync`             | `content/` dosyalarını veritabanına aktar |
| `npm run content:validate`    | İçerik dosyalarını doğrula                |
| `npm run format`              | Kod biçimlendirme                         |

## Proje yapısı

```
content/            Katalog ve taksonominin yazım kaynağı (JSON, Zod ile doğrulanır)
src/app/            Sayfalar ve API uçları
src/components/     Arayüz bileşenleri
src/lib/data/       Tüm veritabanı sorguları
src/lib/ai/         Yapay zekâ istemcisi ve özellikleri
src/lib/            Saf iş mantığı: filtreleme, öneri, istatistik, arama
supabase/migrations Veritabanı şeması (0001 → 0010, sıralı)
supabase/tests/     Şema ve RLS testleri
docs/               PRD, mimari, veri modeli, kararlar, yol haritası
legacy/             Yeniden yazımdan önceki tek dosyalık sürüm (referans)
```

## Katalog verisi hakkında

Kitaplar depoda `content/books.json` içinde yazılır, `npm run db:sync` ile
Supabase'e aktarılır ve uygulama daima veritabanından okur. Gerekçe:
[ADR 0002](docs/decisions/0002-katalog-kaynagi.md).

`imageUrl` alanları boş: Instagram'ın kapak adresleri süreli imzalı olduğu için
hepsi geçersiz hâle geldi. Kapak yerine başlıktan üretilen kararlı bir
tipografik tasarım gösterilir.

## Lisans

Özel proje.
