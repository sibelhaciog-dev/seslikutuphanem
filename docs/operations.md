# Kurulum ve İşletme

**Son güncelleme:** 2026-08-20

---

## 1. Yerel geliştirme

```bash
npm install
cp .env.example .env.local     # değerleri doldurun
npm run dev                    # http://localhost:3000
```

## 2. Ortam değişkenleri

| Değişken                        | Nereden                                       | Nerede kullanılır                |
| ------------------------------- | --------------------------------------------- | -------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase → Project Settings → API             | istemci + sunucu                 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | aynı sayfa                                    | istemci + sunucu                 |
| `NEXT_PUBLIC_SITE_URL`          | sitenin adresi                                | e-posta yönlendirmeleri, sitemap |
| `DATABASE_URL`                  | Supabase → Database → Connection string (URI) | **yalnızca yerel betikler**      |
| `AI_*`                          | bkz. [ai.md](ai.md)                           | yalnızca sunucu                  |

> `DATABASE_URL` tüm veriye erişir ve RLS'i baypas eder. Vercel'e **eklemeyin**;
> yalnızca `npm run db:sync` ve `npm run db:types` için yerelde bulunsun.

`db:sync` ve `db:types` betikleri `.env.local` ve `.env` dosyalarını kendisi
okur — ayrıca `export` etmeye gerek yok. Öncelik sırası Next.js ile aynı:
komut satırında verilen değişken > `.env.local` > `.env`. Bu sıralama
bilinçli: `npm run db:sync:local` bağlantıyı satır içinde verdiği için
`.env.local` üretime bakarken bile yerel veritabanına yazar.

## 3. Veritabanını kurma (yeni proje)

1. Supabase'de yeni proje aç.
2. **SQL Editor** → `supabase/migrations/` altındaki dosyaları **sırayla**
   (0001 → 0015) yapıştırıp çalıştır.
3. İçeriği yükle. İki yol var:

   **a) Veritabanı parolası varsa** — tek komut:

   ```bash
   DATABASE_URL="postgresql://..." npm run db:sync
   ```

   **b) Yalnızca SQL çalıştırma yetkisi varsa** (panel, MCP) — önce tohum
   dosyalarını üret, sonra sırayla yapıştır:

   ```bash
   npm run content:sql          # supabase/seed/ altına yazar
   ```

   Üretilen dosyalar idempotenttir; tekrar çalıştırmak zarar vermez. Yükleme
   sonrası sayıları doğrulayın: 196 kitap, 451 `book_topics`, 141
   `book_interests`.

4. Yönetici olacak kişileri ön yetki listesine ekle. Bu kişiler kayıt olur
   olmaz yönetici olur; kayıt sırasını beklemek gerekmez:

   ```sql
   insert into public.pending_role_grants (email, role, note)
   values ('senin@eposta.com', 'admin', 'Kurucu');
   select public.apply_pending_role_grants();   -- zaten kayıtlıysa geriye dönük uygular
   ```

5. **Authentication → URL Configuration → Redirect URLs** listesine
   `https://<siteniz>/auth/callback` ekle.

## 4. Yerel Supabase (uçtan uca test)

Docker varsa tüm yığın yerelde çalışır — gerçek Postgres, PostgREST, Auth,
Storage:

```bash
npx supabase start          # ilk seferde birkaç yüz MB imaj iner
npm run db:sync:local       # kataloğu yükle
npm run db:types:local      # tipleri şemadan üret
npm run test:e2e            # 25 iddia: auth, RLS, tetikleyiciler, arama
npx supabase stop           # bitince
```

`supabase start` çıktısındaki `PUBLISHABLE_KEY` ve `API_URL` değerlerini
`.env.local` dosyasına yazarsanız uygulama yerel yığına bağlanır.

Bu, birim testlerinin ve SQL şema testlerinin göremediği katmanı doğrular:
PostgREST üzerinden RLS, gerçek JWT'li oturum, zincirleme silme.

## 5. Şema değişikliği

```bash
npm run db:test      # Docker'da sıfırdan kurulum + 40+ iddia
npm run db:local     # şemayı ayakta bırak
npm run db:types     # tipleri üret (DATABASE_URL yerel Docker'ı göstermeli)
```

`db:test` Docker ister. Supabase'in `auth` ve `storage` şemaları
`scripts/supabase-stub.sql` ile taklit edilir.

## 6. İçerik güncelleme

```bash
npm run content:validate                     # şema + tutarlılık
DATABASE_URL="postgresql://..." npm run db:sync
DATABASE_URL="postgresql://..." npm run db:sync -- --prune   # silinenleri arşivle
```

Senkron idempotenttir; defalarca çalıştırılabilir.

## 7. Yayına alma (Vercel)

1. Depoyu Vercel'e bağla. Framework algılaması `vercel.json` ile depodan
   geliyor (`"framework": "nextjs"`), panelden ayarlamaya gerek yok.
   Not: Vercel algılamayı **içe aktarma anında** ve o anki üretim dalına
   bakarak yapar; dal yanlışsa algılama boş kalır ve derleme çıktısını
   statik site sanır.
2. Ortam değişkenlerini gir (`DATABASE_URL` hariç).
3. `NEXT_PUBLIC_SITE_URL` gerçek alan adı olsun.
4. Aynı adresi Supabase Redirect URLs listesine ekle.

### Üretim projesi

| Alan          | Değer                                      |
| ------------- | ------------------------------------------ |
| Supabase adı  | `kutuphanem`                               |
| Proje kimliği | `ygaxtmuzhnntzdcltmgn`                     |
| API adresi    | `https://ygaxtmuzhnntzdcltmgn.supabase.co` |

Vercel'e girilecek değişkenler: `NEXT_PUBLIC_SUPABASE_URL`,
`NEXT_PUBLIC_SUPABASE_ANON_KEY` (panelde Project Settings → API →
publishable key), `NEXT_PUBLIC_SITE_URL`, ve yapay zekâ kullanılacaksa
`AI_BASE_URL` / `AI_API_KEY` / `AI_TEXT_MODEL` / `AI_VISION_MODEL`.

`DATABASE_URL` **Vercel'e girilmez** — yalnızca yerelde içerik senkronu için.

## 8. Komut özeti

| Komut                      | Ne yapar                                         |
| -------------------------- | ------------------------------------------------ |
| `npm run dev`              | Geliştirme sunucusu                              |
| `npm run build` / `start`  | Üretim derlemesi / çalıştırma                    |
| `npm run check`            | Tip kontrolü + lint + testler                    |
| `npm test`                 | Birim testleri                                   |
| `npm run db:test`          | Şema + RLS testleri (Docker)                     |
| `npm run db:local`         | Yerel şemayı kur ve açık bırak                   |
| `npm run db:types`         | Veritabanı tiplerini üret                        |
| `npm run db:sync`          | İçeriği veritabanına aktar                       |
| `npm run content:validate` | İçerik dosyalarını doğrula                       |
| `npm run content:sql`      | `supabase/seed/` altına SQL tohum dosyaları üret |
| `npm run format`           | Kod biçimlendirme                                |

## 9. Sorun giderme

| Belirti                                         | Olası sebep                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Tüm sayfalar 500                                | `NEXT_PUBLIC_SUPABASE_*` eksik veya hatalı                                                             |
| Katalog boş, rehber menüsü yok                  | Migration çalıştırılmamış veya `db:sync` yapılmamış                                                    |
| Rehber menüsü boş ama site açılıyor             | Veritabanına erişilemiyor (taksonomi hatası yutuluyor)                                                 |
| Kapak tarama 503                                | `AI_API_KEY` tanımlı değil                                                                             |
| Kapak tarama 429                                | Günlük kota doldu                                                                                      |
| Yönetim sayfası ana sayfaya atıyor              | Kullanıcının `user_roles` kaydı yok                                                                    |
| `db:sync` "relation does not exist"             | Migration'lar eksik veya sırasız çalıştırılmış                                                         |
| Sayfada eski/yanlış veri, veritabanı doğru      | Next.js disk önbelleği. Veritabanı değiştirdiyseniz `rm -rf .next` ve yeniden derleyin                 |
| Migration yerelde geçip Supabase'de patlıyor    | Uzantı nesnesi nitelenmemiş — `extensions.unaccent` gibi yazılmalı                                     |
| `permission denied for function ...`            | Fonksiyon `0013`'te REST yüzeyinden çıkarıldı; uygulamadan çağrılıyorsa `grant execute` ekleyin        |
| Yönetim sayfası açılmıyor, kullanıcı yeni       | `pending_role_grants` listesinde adres yok; ekleyip `apply_pending_role_grants()` çalıştırın           |
| Vercel derlemesi "Invalid URL" ile düşüyor      | `NEXT_PUBLIC_SITE_URL` şemasız yazılmış. Kod artık `https://` ekliyor ama değeri tam yazmak daha doğru |
| Vercel "No Output Directory named public" diyor | Framework algılaması boş kalmış. `vercel.json` içindeki `"framework": "nextjs"` bunu çözer             |
