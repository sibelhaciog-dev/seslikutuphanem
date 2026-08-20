# ADR 0004 — Kütüphane: durum + okuma oturumu

**Durum:** Kabul edildi · **Tarih:** 2026-08-20

## Bağlam

v1'de okuma verisi üç ayrı yapıdaydı ve hepsi kusurluydu:

- `favs` — çocuk başına favori listesi
- `okumalar` — **çocuk ayrımı olmadan**, kitap bağlantısına göre `{okundu, yildiz, tarih}`
- `okuyacak` — çocuk _adına_ göre ayrı bir localStorage listesi

Sonuç: kardeşler aynı okuma kaydını paylaşıyordu; bir kitap yalnızca bir kez
okunabiliyordu; okuma listesi kataloğa bağlı değildi.

Oysa çocuk kitaplarında **tekrar okuma kuraldır**; aynı kitap haftalarca her
akşam okunur. Bu, ürünün ölçmesi gereken en anlamlı sinyallerden biri.

## Karar

İki tablo:

**`library_items`** — bir çocuğun bir kitapla ilişkisinin _bugünkü durumu_

- `status`: `to_read` | `reading` | `read` | `abandoned`
- `is_favorite`, `rating` (0–5)
- `times_read`, `first_read_at`, `last_read_at` (tetikleyiciyle türetilir)
- `book_id` **veya** `custom_book_id` (biri dolu, diğeri boş)

**`reading_sessions`** — her okuma olayı ayrı satır

- `read_on`, `minutes`, `mood`, `note`

Notlar `reading_notes` tablosunda ve `library_item_id`'ye bağlı; böylece
çocuk + kitap kapsamı otomatik olarak doğru.

## Gerekçe

- Takvim, seri (streak) ve "bu ay kaç kitap" hesapları oturumlardan doğar;
  durum tablosundan değil.
- "Okunacak" ayrı bir tablo değil, sadece bir durum. Okuma listesi ile
  kütüphane tek modelde birleşir.
- `times_read` gibi türetilmiş alanlar tetikleyiciyle güncellenir; okuma
  yolunda ek sorgu yok.

## Sonuçlar

- Bir kitabı "okundu" işaretlemek hem durumu değiştirir hem bir oturum açar.
- Yıldız puanını sıfırlamak kitabı "okunmadı" yapmaz (v1 davranışı korundu).
- Katalogda olmayan kitaplar `custom_books` tablosunda; katalog temiz kalır.
  Sonradan eşleşme bulunursa `custom_books.matched_book_id` doldurulur.
