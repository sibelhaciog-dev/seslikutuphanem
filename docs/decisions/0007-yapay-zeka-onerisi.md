# ADR 0007 — Yapay zekâ öneriyi seçer, üretmez

**Durum:** Kabul edildi · **Tarih:** 2026-08-21
**Değiştirdiği:** PRD ilke 5'in "yapay zekâ yalnızca açıklama yazar" kısmı

## Bağlam

PRD ilke 5 şunu söylüyordu: _"Yapay zekâ yardımcıdır, karar verici değildir.
Öneri sıralamasını deterministik motor yapar; yapay zekâ yalnızca açıklama
yazar ve kapak tanır."_

Bu ilke dört gerçek riski karşılıyordu:

1. **Uydurma.** Dil modeli katalogda olmayan kitap adı üretir; ebeveyn arar,
   bulamaz, ürüne güveni sarsılır.
2. **Yaş güvenliği.** Bir çocuk kitapları uygulamasında 4 yaşındaki çocuğa
   12+ bir kitabın önerilmesi kabul edilemez.
3. **Dayanıklılık.** Sağlayıcı çökerse ürün çalışmaya devam etmeli.
4. **Açıklanabilirlik.** "Neden önerildi" sorusunun cevabı olmalı.

Ancak uygulamada ilke şu sonuca yol açtı: öneri tamamen deterministik, yapay
zekâ yalnızca rapor sayfasında bir paragraf yazıyor. Ebeveynin **o anki
ihtiyacını** ifade edebileceği hiçbir yer yok — "kardeşi olacak", "bugün çok
huzursuzdu", "uçak yolculuğu için bir şey lazım" gibi. Oysa bir kitap
rehberinde en değerli sinyal tam olarak budur ve deterministik motorun bunu
anlaması mümkün değil.

## Karar

Yapay zekâ **seçer ve gerekçelendirir; üretmez.**

```
Kullanıcı niyeti (mod + serbest metin) + çocuk profili + okuma geçmişi
      │
 [1]  Deterministik aday havuzu
      yaş süzgeci · ilgi alanı · öncelikli konu · mod eğilimi
      · okunmuşları çıkar                             → ~30-40 kitap
      │
 [2]  Yapay zekâ: adaylar arasından 3-5 tanesini SEÇ, SIRALA, GEREKÇE yaz
      girdi: yalnızca aday kitapların id/başlık/özet/konu
      çıktı: [{ bookId, reason }]
      │
 [3]  Beyaz liste doğrulaması: dönen her bookId aday havuzunda mı?
      değilse sessizce atılır
      │
 [4]  Yapay zekâ kapalı/yavaş/hatalı → deterministik sıralama gösterilir
```

Yükü taşıyan adım **[3]**. Modelin çıktısı bir _seçim_, bir _üretim_ değil.

## Gerekçe

Dört riskin dördü de korunuyor:

1. **Uydurma imkânsız** — model yalnızca kendisine verilen kimliklerden
   seçebilir, dönen kimlik havuzda yoksa atılır.
2. **Yaş güvenliği deterministik katmanda** — havuz zaten yaşa göre süzülmüş;
   modelin yaş kuralını "anlamasına" güvenmiyoruz.
3. **Dayanıklılık** — [4] her zaman var; yapay zekâ bir iyileştirme
   katmanı, bir bağımlılık değil.
4. **Açıklanabilirlik artıyor** — deterministik etiketler ("yaşına uygun",
   "sevdiği konu") yerine niyete bağlı bir cümle geliyor.

Alternatif olarak tüm katalog modele verilebilirdi. Reddedildi: 196 kitabın
tamamı ~60 KB istem demek (yavaş ve pahalı), yaş güvenliği modelin insafına
kalırdı ve uydurma kapısı açılırdı. Kazanç, bu bedeli karşılamıyor.

## Sonuçlar

- PRD ilke 5 yeniden yazıldı: yapay zekâ **sıralar ve gerekçelendirir**, ama
  yalnızca deterministik motorun onayladığı adaylar arasından.
- Deterministik motor kaldırılmıyor; aksine artık iki işi var: doğrudan
  öneri üretmek **ve** yapay zekâya güvenli bir aday havuzu hazırlamak.
- Sonuçlar `ai_recommendations` tablosunda saklanıyor; kullanıcı eski
  çalıştırmalarına dönebiliyor.
- Yeni bir kota kalemi (`recommendation`) ve yeni bir uç (`POST /api/oneri`).
- Çocuk profili **zorunlu değil**: profil yoksa yalnızca mod ve serbest
  metinle çalışır, arayüz profille daha iyi sonuç vereceğini söyler.
