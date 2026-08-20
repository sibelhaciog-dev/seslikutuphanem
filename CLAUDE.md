# Sesli Kütüphanem — Claude Code için çalışma talimatları

Bu dosya, bu klasörde çalışan Claude Code oturumları içindir. Aşağıdaki kurallar
kullanıcı aksini söylemedikçe geçerlidir.

---

## 1. Kiminle konuşuyorsun

Bu projenin sahibi bir **öğretmen**. Yazılım geçmişi yok ama projeyi kendisi
başlattı, geliştirmeye devam ediyor ve öğrenmeye açık. Yani karşındaki kişi hem
**ürünün sahibi** hem de **öğrenmekte olan biri**.

Bunun pratik karşılığı: kararlar ona ait, işi sen yaparsın, yolda ne olduğunu
anlaşılır biçimde anlatırsın. Ne "sen anlamazsın" tavrı, ne de cevaplanamayacak
teknik sorularla baş başa bırakmak.

### Nasıl anlatmalı

- **Türkçe konuş.** Kullanıcı hangi dilde yazarsa o dilde cevap ver; belirsizse
  Türkçe.
- **Sonucu önce söyle.** İlk cümle ne değiştiğini anlatsın: "Kitap
  kartlarındaki kalp simgesini büyüttüm, artık telefonda daha kolay basılıyor."
- **Teknik konulardan kaçınma, çevir.** Terimi kullan ama yanına bir cümlelik
  karşılığını koy: "Kitap listesini veritabanına taşıdım — yani artık yeni
  kitap eklemek için siteyi yeniden yayına almak gerekmiyor." Bir kavramı bir
  kez açıkladıysan sonraki seferlerde doğrudan adıyla kullanabilirsin.
- **Ayrıntıyı katman katman ver.** Kısa özetle başla. "Neden böyle yaptın?",
  "nasıl çalışıyor?" diye sorulursa seve seve derinleş — sorulunca geçiştirme.
  Sorulmadan da uzun teknik anlatıma girme.
- **Hata çıkarsa önce çöz, sonra anlat.** "Kaydetme sırasında bir sorun vardı,
  düzelttim" yeterli. Ham hata çıktısını yapıştırma; ne olduğunu kendi
  cümlelerinle söyle.
- **Yapılamayan bir şey varsa** nedenini gündelik dille açıkla ve yerine ne
  yapılabileceğini öner.

### Soru sormak

Soru sormak iyidir; önemli olan cevaplanabilir bir soru olması.

- **Ürün kararlarını ona bırak.** "Bu bölüm sadece giriş yapanlara mı görünsün,
  herkese mi?" — tam da onun karar vermesi gereken şey.
- **Teknik bir seçim gerekiyorsa seçenekleri anlat ve birini öner.** Sessizce
  karar verip geçme; ama kararı da tümüyle ona yıkma. Şu biçim iyi çalışıyor:

  > Kitap kapaklarını iki şekilde saklayabiliriz:
  >
  > 1. **Projenin içinde tutmak** — kurulumu basit, ama her yeni kapak için
  >    siteyi yeniden yayına almak gerekiyor.
  > 2. **Supabase'in dosya deposunda tutmak** — ilk kurulum biraz daha uzun,
  >    ama sonrasında kapak eklemek siteye dokunmadan mümkün.
  >
  > Ben 2'yi öneriyorum, çünkü zamanla epey kapak eklenecek. Sen ne dersin?

- **Küçük ve geri alınabilir şeylerde kendin karar ver.** Değişken adı, dosya
  düzeni, hangi yardımcı fonksiyonu yazdığın gibi konular. Gerekirse yaptığın
  seçimi tek cümleyle belirtmen yeter.
- **Geri döndürmesi zor kararlarda mutlaka sor.** Veritabanı şemasını
  değiştirmek, veri silmek, adresleri (URL) değiştirmek, dışarıdan bir servise
  bağlanmak, ücretli bir şey açmak.
- **Tahmin ettiğin şeyleri belirt.** "Yaş aralığını 4–8 olarak koydum,
  değiştirmek istersen söyle" demek, sessizce varsaymaktan iyidir.

### `_MEHMET_MODE_`

Kullanıcının mesajında **`_MEHMET_MODE_`** geçiyorsa, karşındaki kişi projenin
teknik danışmanı Mehmet'tir. O mesaj ve sonrasındaki oturum boyunca:

- Tamamen teknik konuşabilirsin: mimari, tip sistemi, RLS politikaları,
  performans, ödünleşimler, komut çıktıları, dosya yolları — hepsi serbest.
- Seçenekleri ve ödünleşimleri açıkça sun, görüş iste.
- Hataları, riskleri ve teknik borcu olduğu gibi raporla.
- İngilizce de yazabilirsin.

`_MEHMET_MODE_` geçmiyorsa yukarıdaki anlatım biçimine dön.

---

## 2. Git kuralları

- **`main` dalına commit veya push yapma** — kullanıcı açıkça istemedikçe.
- Her iş için yeni bir dal aç: `git checkout -b <kısa-açıklayıcı-ad>`.
- Commit mesajları Türkçe ve anlaşılır olsun.
- Push, PR ve birleştirme işlemlerini yalnızca istenirse yap.
- Dal ve commit ayrıntısına girmene gerek yok; ama "değişiklikleri ayrı bir
  dalda tuttum, istediğin zaman yayına alabiliriz" demek faydalı olabilir.

---

## 3. Her işin sonunda

```bash
npm run check              # tip kontrolü + lint + testler — hepsi geçmeli
```

Neye dokunduysan ek olarak:

| Dokunduğun şey                | Ayrıca çalıştır                      |
| ----------------------------- | ------------------------------------ |
| `content/` altındaki dosyalar | `npm run content:validate`           |
| `supabase/migrations/`        | `npm run db:test`                    |
| Görsel/arayüz değişikliği     | `npm run dev` ile açıp gerçekten bak |

Bir kontrol başarısız olursa önce kendin düzeltmeye çalış. Düzelttiysen kısaca
neyi düzelttiğini söyle; ham hata çıktısını paylaşmana gerek yok.

### Dokümantasyonu güncelle

Bu proje `docs/` klasörünü canlı tutar. Değişiklikle birlikte ilgili dosyayı da
güncelle — ayrı bir iş değil, işin parçası:

| Değişiklik                           | Güncellenecek                             |
| ------------------------------------ | ----------------------------------------- |
| Veritabanı şeması                    | `docs/data-model.md` + `npm run db:types` |
| Yeni sayfa / katman / veri akışı     | `docs/architecture.md`                    |
| Yeni özellik veya kapsam değişikliği | `docs/prd.md`                             |
| Geri döndürülmesi zor teknik seçim   | `docs/decisions/` altına yeni ADR         |
| Ortam değişkeni veya kurulum adımı   | `docs/operations.md` + `.env.example`     |
| Biten veya yeni çıkan iş             | `docs/roadmap.md`                         |

---

## 4. Proje ne yapıyor

Çocuk kitapları rehberi. Ebeveyn kayıt olur, çocukları için profil oluşturur;
uygulama çocuğun yaşına, ilgi alanlarına ve öncelikli gelişim konularına göre
kitap gösterir. Ebeveyn okuduklarını işaretler, puanlar, not tutar; rapor,
takvim ve başarımlarla ilerlemeyi görür. Kitaplar `sesli.kutuphanem` Instagram
hesabındaki tanıtımlarla eşleşir.

Ayrıntı: `docs/prd.md`

**Arayüz dili tamamen Türkçe.** Kullanıcıya görünen her metin Türkçe olmalı.
Koddaki değişken/fonksiyon adları ve veritabanı alanları İngilizce, kod
yorumları Türkçe.

---

## 5. Dosyalar nerede

```
content/                   KİTAP VE İÇERİK VERİSİ (yazım kaynağı)
  books.json               196 kitap
  taxonomy.json            gelişim rehberleri + ilgi alanları
  achievements.json        başarımlar
  organizations.json       bağış kurumları

src/
  app/                     Sayfalar (her klasör bir adres)
    (catalog)/page.tsx     Ana sayfa — kitap listesi
    kitap/[slug]/          Tek kitap sayfası
    giris/ kayit/          Giriş ve kayıt
    onboarding/            İlk kurulum sihirbazı
    kutuphanem/            Okunanlar + okuma listesi + başarımlar
    rapor/ takvim/         Okuma raporu ve takvim
    profil/                Çocuk profilleri ve avatar
    takas/ bagis/ gorus/   Takas, bağış, geri bildirim
    yonetim/               Editör arayüzü (rol gerektirir)
    api/                   Yapay zekâ uçları (sunucu tarafı)
  components/              Arayüz parçaları
  lib/
    data/                  TÜM VERİTABANI SORGULARI burada
    ai/                    Yapay zekâ istemcisi ve özellikleri
    content/               İçerik dosyalarının şemaları
    filters · stats · recommendations · age · search   (saf iş mantığı, testli)
supabase/
  migrations/              Veritabanı şeması (sıralı, 0001 → 0012)
  tests/schema_test.sql    Şema ve RLS testleri
docs/                      PRD, mimari, veri modeli, kararlar, yol haritası
legacy/index.html          Eski tek dosyalık sürüm — sadece referans
```

---

## 6. Sık istenen işler

### "Şu kitabı ekle" / "kitap listesini güncelle"

Kitaplar `content/books.json` içinde. Yeni kayıt şöyle:

```json
{
  "slug": "caya-gelen-kaplan",
  "title": "Çaya Gelen Kaplan",
  "summary": "Kısa tanıtım yazısı.",
  "language": "tr",
  "ageMin": 3,
  "ageMax": 8,
  "authors": ["Judith Kerr"],
  "instagram": {
    "url": "https://www.instagram.com/p/DWRv15ojdg-/",
    "shortcode": "DWRv15ojdg-",
    "postedAt": "2026-04-14",
    "likeCount": 0
  },
  "status": "published",
  "topics": [{ "slug": "sosyal-sinirlar", "relevance": 4 }]
}
```

- `slug` Türkçe karakterler sadeleştirilmiş ve benzersiz olmalı.
- `topics[].slug` değerleri `content/taxonomy.json` ile birebir aynı olmalı.
- Bilinmeyen alanı yazma (varsayılanı devreye girer); `summary` ve yaş
  aralığını doldur.
- Sonra `npm run content:validate`, ardından `npm run db:sync` (bunun için
  `DATABASE_URL` gerekir). Bağlantı bilgisi yoksa kitabı dosyaya ekle ve durumu
  açıkla: "Kitabı listeye ekledim; sitede görünmesi için veritabanına aktarmam
  gerekiyor, onun için Supabase bağlantı bilgisi lazım."

Kullanıcı yalnızca Instagram bağlantısı verdiyse eksik alanları bağlantıdan ve
verdiği bilgiden kendin tamamla. Tahmin ettiğin alanları sonunda belirt ki
isterse düzeltsin.

### "Rehberlere yeni bir başlık ekle"

`content/taxonomy.json` içindeki `developmentAreas` listesini düzenle. Sol menü,
filtreler ve otomatik etiketleme aynı listeden üretilir. Yeni başlığa
`keywords` de yaz ki etiketlenmemiş kitaplar da yakalansın. Sonra `db:sync`.

### "Renkleri / yazı tipini değiştir"

`src/app/globals.css` içindeki `@theme` bloğu tüm renk ve yazı tiplerini
tanımlar. Oradan değiştir; uygulamanın tamamı otomatik uyar.

### "Şu yazıyı değiştir"

Metinler bileşenlerin içinde. Enum karşılıkları (`Okundu`, `Kız`, `Yarım
bırakıldı`…) `src/lib/labels.ts` içinde. `grep -r "aranan metin" src/` ile bul.

### "Yeni bir sayfa ekle"

`src/app/<adres>/page.tsx` oluştur. Giriş zorunlu olacaksa adresi
`src/middleware.ts` içindeki `PROTECTED_PREFIXES` listesine ekle. Menüde
görünecekse `src/components/layout/SiteHeader.tsx` içindeki `MENU_ITEMS`
listesine ekle.

### "Bir şey çalışmıyor"

Önce `npm run dev` ile aç ve sorunu kendin bulmaya çalış. `docs/operations.md`
sonundaki sorun giderme tablosuna bak. Veritabanıyla ilgiliyse `npm run db:test`
ile şemanın sağlam olduğunu doğrula. Sorunu bulduğunda ne olduğunu sade bir
dille anlat — kullanıcı genelde belirtiyi tarif eder, sebebi sen bulursun.

---

## 7. Teknik zemin

- **Next.js 15 (App Router) + React 19 + TypeScript (strict) + Tailwind v4**
- **Supabase** — kimlik doğrulama, Postgres, depolama. Her tabloda RLS açık.
- **Yapay zekâ** — OpenAI uyumlu uç nokta (varsayılan OpenRouter). Metin ve
  görsel için ayrı modeller. Ayrıntı: `docs/ai.md`
- **Vitest** — `src/lib` altındaki saf iş mantığı testli.
- **Şema testleri** — `npm run db:test`, Docker'da gerçek Postgres üzerinde.

### Uyulması gereken kurallar

- **Bileşenler doğrudan Supabase çağırmaz.** Sorgular `src/lib/data` içinde.
  (Tek satırlık form `insert`'leri istisna.)
- Sunucu gizli anahtarları (`AI_API_KEY`, `DATABASE_URL`) **asla** istemci
  koduna sızmamalı. `NEXT_PUBLIC_` öneki olmayan hiçbir değişkeni istemci
  bileşeninde okuma.
- **Hiçbir anahtarı depoya yazma** — yerel geliştirme anahtarları dahil.
  `supabase start` her seferinde aynı sabit anahtarları üretir ama bunlar da
  gizli anahtar biçiminde olduğu için GitHub'ın gizli bilgi koruması push'u
  reddeder. Anahtarlar çalışma anında ortamdan veya `supabase status`
  çıktısından okunmalı (örnek: `scripts/e2e/local-smoke.mjs`).
- Şema değiştirirsen `supabase/migrations/` altına **yeni** dosya ekle (mevcut
  dosyaları düzenleme), `npm run db:test` çalıştır, `npm run db:types` ile
  tipleri üret ve `docs/data-model.md`'yi güncelle.
- Yeni tabloya mutlaka RLS politikası yaz ve `schema_test.sql` içine yalıtım
  testi ekle. Politikasız tablo = herkese açık veri.
- Yeni iş mantığı `src/lib` altına ve testiyle birlikte gelsin.
- Erişilebilirliği bozma: butonlar `<button>`, formlar `<form>`, görsellerde
  `alt`, açılır pencerelerde `Dialog` bileşeni (odak yönetimi hazır geliyor).

### Bilinçli olarak böyle

- **Kök dizine `loading.tsx` ekleme.** Suspense sınırı, akış başladıktan sonra
  oluşan hataların durum kodunu 200'e sabitliyor; `notFound()` çağrıları
  "yumuşak 404" oluyor. İskelet yalnızca `(catalog)` rota grubunda.
- **Oturum değişimlerinde tam sayfa gezinme kullanılıyor** (`giriş`, `kayıt`,
  `çıkış`). İstemci tarafı gezinme, oturum çerezi yazılmadan başlayabiliyor ve
  kullanıcı giriş sayfasına geri atılıyordu.
- **Oturuma bağlı sayfalara `revalidate` verilmiyor.** Next.js sayfayı yerleşimle
  birlikte önbelleğe alıyor ve giriş yapmış kullanıcı anonim kabuğu görüyor.
  Önbellek veri katmanında (`unstable_cache`).
- **Kitap kapakları çoğunlukla yok.** Instagram'ın kapak adresleri süreli
  imzalıydı ve hepsi geçersiz oldu. Kapak yerine başlıktan üretilen tipografik
  bir tasarım gösteriliyor. Yeniden Instagram adresi eklemeye çalışma.
- **Türkçe aramada gövdeleme (stemming) kullanılmıyor**, önek eşleştirmesi
  var. Snowball Türkçe gövdeleyicisi aynı kökten kelimeleri farklı gövdelere
  indiriyordu. Ayrıntı: `docs/data-model.md` §3.
- **Katalog istemciye gönderiliyor** (~60 KB). Anında filtreleme için bilinçli
  tercih. Birkaç bin kitaba çıkarsa sunucu tarafı aramaya geçilmeli.
- **İçerik iki yerde:** depoda `content/` (yazım kaynağı), veritabanında
  (çalışma zamanı). Yönetim arayüzünden yapılan düzenleme veritabanına yazar;
  kalıcı olması için içerik dosyasına da işlenmeli. Gerekçe:
  `docs/decisions/0002`.
