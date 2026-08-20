# ADR 0001 — Next.js + Supabase yığını

**Durum:** Kabul edildi · **Tarih:** 2026-08-20

## Bağlam

Proje 4.374 satırlık tek bir `index.html` dosyasıydı: HTML, CSS, JavaScript ve
196 kitaplık veri iç içeydi. GitHub Pages üzerinde yayınlanıyordu. Kimlik
doğrulama ve veri için Supabase kullanılıyordu ama şema eksikti; kullanıcı
verisinin bir kısmı `localStorage`'da tutuluyordu.

Ürün sahibinin teknik geçmişi yok; günlük değişiklikleri bir yapay zekâ
asistanı (Claude Code) üzerinden yapıyor.

## Karar

**Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind CSS v4 +
Supabase** kullanıyoruz. Barındırma Vercel.

## Gerekçe

- **Sunucu tarafı gerekiyor.** Yapay zekâ anahtarı istemciye sızmamalı; bu tek
  başına statik barındırmayı eliyor.
- **SEO önemli.** Kitap sayfaları Instagram'dan gelen trafiğin ineceği yer;
  sunucuda render edilmeleri gerekiyor.
- **Supabase zaten kullanımdaydı.** Kimlik doğrulama, Postgres, depolama ve
  satır bazlı güvenlik tek üründe geliyor; ayrı bir arka uç yazmaya gerek yok.
- **Asistan dostu.** Next.js App Router ve Supabase, üzerinde en çok
  dokümantasyon bulunan yığınlardan; asistanın doğru kod üretme olasılığı
  yüksek.

## Sonuçlar

- GitHub Pages artık kullanılamaz; barındırma Vercel'e taşınır.
- Ortam değişkenleri gerekir; `.env.local` olmadan uygulama açılmaz.
- Middleware oturum çerezini tazeler; her istek Supabase'e bir çağrı yapar.
- Kök dizine `loading.tsx` eklenemez — Suspense sınırı `notFound()` çağrılarının
  200 durum koduyla dönmesine yol açıyor. Yükleme iskeleti yalnızca
  `(catalog)` rota grubunda.
