# ADR 0005 — Veritabanında İngilizce adlandırma

**Durum:** Kabul edildi · **Tarih:** 2026-08-20

## Bağlam

v1'de karışıktı: tablo adları İngilizce (`children`, `child_interests`), enum
değerleri Türkçe (`kiz`, `erkek`, `kamera`), kod içindeki fonksiyon adları
Türkçe (`kitapGelisimAnahtar`, `oneriUret`), arayüz Türkçe.

## Karar

- **Veritabanı:** tablo, sütun, enum değeri, fonksiyon, politika adları
  **İngilizce**.
- **Kod:** değişken ve fonksiyon adları **İngilizce**, yorumlar **Türkçe**.
- **Arayüz:** kullanıcıya görünen her metin **Türkçe**.
- **İçerik:** kitap başlıkları, gelişim konusu adları Türkçe (veri, kod değil).

Enum değerlerinin Türkçe karşılıkları arayüz katmanında sözlüklerle üretilir
(`src/lib/labels.ts`).

## Gerekçe

- Türkçe tanımlayıcılar `ı`, `ş`, `ğ` gibi karakterler yüzünden alıntılama
  gerektirir ve araç zincirinde (ORM'ler, tip üreteçleri, arama) sorun çıkarır.
- Tek dil kuralı, asistanın hangi dilde isim vereceğini tahmin etmesini
  gerektirmez.
- Arayüz metnini tek yerde toplamak, ileride ikinci bir dil eklenirse işi
  kolaylaştırır.

## Sonuçlar

- `gender` değerleri artık `girl` / `boy` / `unspecified` (v1'de `kiz`/`erkek`).
- Bu değişiklik eski veriyle uyumlu değil; ADR 0006'ya bakınız.
