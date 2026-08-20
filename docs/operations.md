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

## 3. Veritabanını kurma (yeni proje)

1. Supabase'de yeni proje aç.
2. **SQL Editor** → `supabase/migrations/` altındaki dosyaları **sırayla**
   (0001 → 0010) yapıştırıp çalıştır.
3. İçeriği yükle:
   ```bash
   DATABASE_URL="postgresql://..." npm run db:sync
   ```
4. Kendine editör yetkisi ver (SQL Editor'de):
   ```sql
   insert into public.user_roles (user_id, role)
   select id, 'admin' from auth.users where email = 'senin@eposta.com';
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

1. Depoyu Vercel'e bağla (framework otomatik algılanır).
2. Ortam değişkenlerini gir (`DATABASE_URL` hariç).
3. `NEXT_PUBLIC_SITE_URL` gerçek alan adı olsun.
4. Aynı adresi Supabase Redirect URLs listesine ekle.

## 8. Komut özeti

| Komut                      | Ne yapar                       |
| -------------------------- | ------------------------------ |
| `npm run dev`              | Geliştirme sunucusu            |
| `npm run build` / `start`  | Üretim derlemesi / çalıştırma  |
| `npm run check`            | Tip kontrolü + lint + testler  |
| `npm test`                 | Birim testleri                 |
| `npm run db:test`          | Şema + RLS testleri (Docker)   |
| `npm run db:local`         | Yerel şemayı kur ve açık bırak |
| `npm run db:types`         | Veritabanı tiplerini üret      |
| `npm run db:sync`          | İçeriği veritabanına aktar     |
| `npm run content:validate` | İçerik dosyalarını doğrula     |
| `npm run format`           | Kod biçimlendirme              |

## 9. Sorun giderme

| Belirti                             | Olası sebep                                            |
| ----------------------------------- | ------------------------------------------------------ |
| Tüm sayfalar 500                    | `NEXT_PUBLIC_SUPABASE_*` eksik veya hatalı             |
| Katalog boş, rehber menüsü yok      | Migration çalıştırılmamış veya `db:sync` yapılmamış    |
| Rehber menüsü boş ama site açılıyor | Veritabanına erişilemiyor (taksonomi hatası yutuluyor) |
| Kapak tarama 503                    | `AI_API_KEY` tanımlı değil                             |
| Kapak tarama 429                    | Günlük kota doldu                                      |
| Yönetim sayfası ana sayfaya atıyor  | Kullanıcının `user_roles` kaydı yok                    |
| `db:sync` "relation does not exist" | Migration'lar eksik veya sırasız çalıştırılmış         |
