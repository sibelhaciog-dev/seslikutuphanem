# Sesli Kütüphanem — Ürün Gereksinimleri (PRD)

**Sürüm:** 2.0 · **Durum:** geliştiriliyor · **Son güncelleme:** 2026-08-20

---

## 1. Tek cümlelik tanım

Sesli Kütüphanem, ebeveynlerin çocuklarına yaşına ve gelişim ihtiyacına uygun
kitap bulmasını, okuduklarını takip etmesini ve çocuğun okuma yolculuğunu
görünür kılmasını sağlayan Türkçe bir çocuk kitapları rehberidir.

## 2. Neden var

Ebeveynler "çocuğuma ne okuyayım?" sorusuna cevap ararken üç sorunla
karşılaşıyor:

1. **Seçenek fazlalığı.** Kitapçıda yüzlerce kitap var; hangisinin çocuğun
   yaşına ve o anki ihtiyacına uygun olduğu belli değil.
2. **İhtiyaç körlüğü.** "Kardeşi doğacak", "okula başlıyor", "karanlıktan
   korkuyor" gibi somut durumlar için kitap aramak zor.
3. **Süreklilik yok.** Okunanlar unutuluyor; çocuğun neyi sevdiği, neyi
   okuduğu kayıt altında değil.

`sesli.kutuphanem` Instagram hesabı birinci soruna zaten cevap veriyor: her
kitap için kısa bir tanıtım. Ürün, bu birikimi aranabilir, filtrelenebilir ve
kişiselleştirilebilir bir rehbere dönüştürür; üstüne okuma takibi ekler.

## 3. Kullanıcılar

| Rol                    | Kim                            | Ne yapar                                                                              |
| ---------------------- | ------------------------------ | ------------------------------------------------------------------------------------- |
| **Ebeveyn** (birincil) | 2–12 yaş çocuğu olan anne/baba | Kitap keşfeder, çocuk profili açar, okunanları işaretler ve puanlar, rapor görür      |
| **Çocuk** (dolaylı)    | 3–12 yaş                       | Kendi avatarını seçer, okudukça aksesuar açar; uygulamayı ebeveynle birlikte kullanır |
| **Editör**             | İçerik sahibi (öğretmen)       | Kitap ekler/günceller, rehber başlıklarını yönetir, geri bildirimleri okur            |
| **Yönetici**           | Teknik danışman                | Rolleri yönetir, içeriği ve sistemi denetler                                          |

## 4. Kapsam

### 4.1 Sürüm 2'de olanlar

**Keşif**

- Yaşa, dile, gelişim alanına ve ilgi alanına göre filtrelenebilen katalog
- Üç modlu arama: kitap adı, konu, yazar (Postgres tam metin araması, Türkçe)
- 8 "gelişim rehberi" ve alt başlıkları (kardeş ilişkileri, ölüm ve yas, okul
  uyumu, akran zorbalığı…)
- Kitap sayfası: özet, yaş aralığı, yazar/çizer, seri, gelişim etiketleri,
  Instagram tanıtımı

**Kişiselleştirme**

- Çoklu çocuk profili (ad, doğum tarihi, cinsiyet, ilgi alanları, öncelikli
  gelişim konuları)
- Çocuğun yaşına göre otomatik filtreleme
- Öneri motoru: okunanlar + beğeniler + ilgi alanları + öncelikli konular
- Yapay zekâ ile yazılmış kişisel rapor yorumu

**Takip**

- Kitap durumu: okunacak / okunuyor / okundu / yarım bırakıldı
- Yıldız puanı, favori işareti
- **Okuma oturumları** — aynı kitap birden çok kez okunabilir, her okuma ayrı
  kaydedilir
- Okuma notları (özel / aile içi / herkese açık)
- Takvim: hangi gün ne okundu, en uzun seri
- Aylık rapor: gelişim alanı dağılımı, dil dağılımı, en beğenilenler

**Oyunlaştırma**

- Yıldız puanı biriktirme
- Avatar karakteri + okudukça açılan aksesuarlar
- Başarımlar (ilk kitap, 10 kitap, 7 günlük seri, 3 farklı gelişim alanı…)

**Kendi kitapların**

- Kitap kapağı fotoğrafından otomatik tanıma (yapay zekâ)
- Elle kitap ekleme
- Katalogda olmayan kitaplar da kütüphanede takip edilebilir

**Topluluk**

- Kitap takası ilanları (şehir bazlı, WhatsApp ile iletişim)
- Kitap bağışı talebi (kurum seçimi)
- Geri bildirim

**Yönetim**

- Editör arayüzü: kitap ekleme/düzenleme, yayın durumu
- Geri bildirim ve bağış taleplerini görme

### 4.2 Sürüm 2'de olmayanlar

- Kitap satışı, sepet, ödeme
- Çocuğun kendi hesabı / girişi
- Sosyal akış, yorum beğenme, takip etme
- Mobil uygulama (web mobil uyumlu)
- Çoklu dil arayüzü (arayüz yalnızca Türkçe)
- E-posta bildirimleri

## 5. Ürün ilkeleri

1. **Ebeveynin zamanı kısıtlı.** Üç tıkta işe yarar bir kitap önerisi.
2. **Çocuk verisi hassastır.** Doğum tarihi, okuma alışkanlığı ve notlar
   yalnızca ebeveynin kendisine görünür. Varsayılan her zaman gizli.
3. **Türkçe, sade dil.** Arayüzde teknik terim yok.
4. **Boş durum yoktur.** Her ekran, kullanıcının bir sonraki adımını söyler.
5. **Yapay zekâ seçer, üretmez.** Aday havuzunu deterministik motor
   hazırlar (yaş süzgeci dahil); yapay zekâ bu adaylar arasından seçer,
   sıralar ve gerekçe yazar. Katalog dışına çıkamaz, yaş dışı öneremez.
   Servis kapalıysa deterministik sıralama gösterilir ve ürün çalışmaya
   devam eder. Ayrıntı: [ADR 0007](decisions/0007-yapay-zeka-onerisi.md)

## 6. Ana akışlar

### 6.1 İlk kullanım

1. Ebeveyn ana sayfada kataloğu görür (giriş gerekmez).
2. Bir kitabı takip etmek isteyince kayıt olur.
3. E-posta doğrulaması → onboarding.
4. Kaç çocuk → her çocuk için ad, doğum tarihi, cinsiyet, ilgi alanları,
   öncelikli gelişim konusu.
5. Katalog artık çocuğun yaşına göre süzülür.

### 6.2 Kitap takibi

1. Kitap sayfası → "Okudum" veya "Okuma listeme ekle".
2. Yıldız puanı → çocuğun puanı artar, aksesuar açılabilir.
3. Aynı kitap tekrar okunursa "Tekrar okuduk" → yeni oturum kaydı.
4. Not eklenir (varsayılan: özel).

### 6.3 Keşif (yapay zekâ destekli öneri)

1. Ana sayfadaki keşif çerçevesi: mod çipleri + kısa mesaj kutusu.
2. "Öner" → deterministik aday havuzu → yapay zekâ seçer ve gerekçelendirir.
3. "Daha detaylı ara →" `/kesif` sayfasını açar: tam form, sonuç ve geçmiş.
4. Geçmiş çalıştırmalar saklanır; ebeveyn eski sonuçlarına dönebilir.
5. Çocuk profili yoksa da çalışır; arayüz profille daha isabetli olacağını
   söyler.

### 6.4 Kapak tarama

1. Kütüphanem → "Kapak tara" → fotoğraf.
2. Sunucu tarafında görsel modeli kitabı tanır.
3. Katalogda eşleşen kitap varsa ona bağlanır, yoksa kişisel kitap oluşur.

## 7. Başarı ölçütleri

| Ölçüt                                                            | Hedef |
| ---------------------------------------------------------------- | ----- |
| Kayıt olan ebeveynin onboarding'i tamamlaması                    | %70   |
| Onboarding sonrası ilk hafta içinde en az 1 kitap işaretlenmesi  | %50   |
| Kayıtlı kullanıcının 30 gün sonra geri dönmesi                   | %30   |
| Katalog arama sonrası kitap sayfası açılması                     | %40   |
| Kapak tarama denemesinin başarıyla kitap tanıması                | %85   |
| Keşif çerçevesinden öneri alan kullanıcının kitap sayfası açması | %50   |

## 8. Kısıtlar ve bilinen gerçekler

- **Kitap kapakları yok.** Instagram'ın kapak adresleri süreli imzalıydı, hepsi
  geçersiz oldu. Kapak yerine başlıktan üretilen tipografik tasarım
  gösteriliyor; editör ve ebeveyn kendi görselini yükleyebiliyor.
- **Katalog ~200 kitap.** Instagram gönderileriyle büyüyor, haftada birkaç
  kitap.
- **Yapay zekâ maliyeti kullanıcı başına sınırlı tutulmalı.** Kapak tanıma ve
  rapor yorumu hız sınırına tabidir.
- **Tek bölge.** Supabase ve Vercel Avrupa bölgesinde; kullanıcılar Türkiye'de.

## 9. Açık sorular

- Takas ilanlarında telefon yerine uygulama içi mesajlaşma gerekir mi?
- Çocuk profilleri ebeveynler arasında paylaşılmalı mı (anne + baba aynı
  çocuğu görsün)?
- Editör kitap eklerken Instagram gönderisinden otomatik içe aktarma ister mi?
