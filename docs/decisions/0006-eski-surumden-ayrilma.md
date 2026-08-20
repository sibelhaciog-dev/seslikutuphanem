# ADR 0006 — Yeni Supabase projesi, geriye dönük uyumluluk yok

**Durum:** Kabul edildi · **Tarih:** 2026-08-20

## Bağlam

Eski sürüm (`legacy/index.html`) hâlâ yayında ve kullanıcıları var. Şema v2,
v1 şemasıyla uyumlu değil: tablolar bölündü, enum değerleri değişti, okuma
verisi çocuk bazına taşındı.

İlk planda migration dosyası hem sıfırdan kurulumu hem eski şemadan
yükseltmeyi destekliyordu. Bu, dosyayı iki kat büyütüyor ve her yeni tabloda
"eski sürümde bu var mıydı?" sorusunu sormayı gerektiriyordu.

## Karar

Ürün sahibinin Supabase organizasyonunda **yeni ve boş bir proje** açıldı.
Şema oradan sıfırdan kurulur. Migration dosyalarında hiçbir yükseltme mantığı
yoktur.

Eski proje ve eski site **olduğu gibi çalışmaya devam eder**; dokunulmaz.

## Sonuçlar

- Eski kullanıcı verisi otomatik taşınmaz. Taşıma gerekirse ayrı ve tek
  seferlik bir betikle yapılır (`scripts/` altında, bu sürümün kapsamında
  değil).
- Migration dosyaları sade ve okunabilir; her biri tek bir konuyu kurar.
- İki sistem bir süre yan yana çalışır. Yeni sürüm hazır olunca eski adres
  yeni adrese yönlendirilir.
