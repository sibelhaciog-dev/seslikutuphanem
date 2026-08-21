-- ═══════════════════════════════════════════════════════════════════════════
-- Şema testleri
--
-- Boş bir veritabanında migration'lar çalıştıktan sonra çalıştırılır:
--   npm run db:test
--
-- Her kontrol başarısız olursa exception fırlatır; sessizce geçen test yoktur.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function pg_temp.assert(condition boolean, label text)
returns void language plpgsql as $$
begin
  if condition is not true then
    raise exception 'BAŞARISIZ: %', label;
  end if;
  raise notice '  ✓ %', label;
end;
$$;

create or replace function pg_temp.assert_eq(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then
    raise exception 'BAŞARISIZ: % (beklenen: %, gelen: %)', label, expected, actual;
  end if;
  raise notice '  ✓ % = %', label, actual;
end;
$$;

-- Belirli bir kullanıcı kimliğiyle "giriş yapmış" gibi davran.
create or replace function pg_temp.login_as(target uuid)
returns void language plpgsql as $$
begin
  -- is_local = false: psql her ifadeyi ayrı işlemde çalıştırdığı için
  -- ayar oturum boyunca kalmalı.
  perform set_config('request.jwt.claim.sub', coalesce(target::text, ''), false);
end;
$$;

do $$ begin raise notice '── Kurulum ──'; end $$;

-- ─── Sabit kimliklerle test verisi ─────────────────────────────────────────
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'ayse@ornek.com'),
  ('a0000000-0000-0000-0000-000000000002', 'burak@ornek.com'),
  ('a0000000-0000-0000-0000-000000000003', 'editor@ornek.com');

insert into public.user_roles (user_id, role)
values ('a0000000-0000-0000-0000-000000000003', 'editor');

insert into public.development_areas (id, slug, name, emoji, color, position) values
  ('d0000000-0000-0000-0000-000000000001', 'duygu', 'Duygu ve Davranış Rehberi', '❤️', '#E8602C', 1),
  ('d0000000-0000-0000-0000-000000000002', 'sosyal', 'Sosyal İlişkiler Rehberi', '🤝', '#378ADD', 2);

insert into public.development_topics (id, area_id, slug, name, keywords, position) values
  ('70000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001',
   'duygu-yonetimi', 'Duygu Yönetimi', array['duygu', 'öfke'], 1),
  ('70000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002',
   'paylasma', 'Paylaşma', array['paylaş'], 1);

insert into public.interests (id, slug, name, emoji, position) values
  ('60000000-0000-0000-0000-000000000001', 'hayvanlar', 'Hayvanlar', '🐾', 1);

insert into public.people (id, slug, display_name) values
  ('50000000-0000-0000-0000-000000000001', 'judith-kerr', 'Judith Kerr');

insert into public.books (id, slug, title, summary, language, age_min, age_max, status, posted_at) values
  ('b0000000-0000-0000-0000-000000000001', 'caya-gelen-kaplan', 'Çaya Gelen Kaplan',
   'Sınırlar üzerine düşündüren zamansız bir klasik.', 'tr', 3, 8, 'published', '2026-04-14'),
  ('b0000000-0000-0000-0000-000000000002', 'paylasmayi-ogreniyorum', 'Paylaşmayı Öğreniyorum',
   'Kardeşiyle oyuncaklarını paylaşmayı öğrenen bir çocuk.', 'tr', 4, 7, 'published', '2026-03-01'),
  ('b0000000-0000-0000-0000-000000000003', 'taslak-kitap', 'Taslak Kitap',
   'Henüz yayınlanmadı.', 'tr', 5, 9, 'draft', null);

insert into public.book_contributors (book_id, person_id, role)
values ('b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'author');

insert into public.book_topics (book_id, topic_id, relevance, source) values
  ('b0000000-0000-0000-0000-000000000001', '70000000-0000-0000-0000-000000000001', 5, 'editorial'),
  ('b0000000-0000-0000-0000-000000000002', '70000000-0000-0000-0000-000000000002', 4, 'editorial');

insert into public.achievements (id, slug, name, description, criteria, points) values
  ('c0000000-0000-0000-0000-000000000001', 'ilk-kitap', 'İlk Kitap', 'İlk kitabını okudun.',
   '{"type":"books_read","threshold":1}'::jsonb, 1),
  ('c0000000-0000-0000-0000-000000000002', 'bes-kitap', 'Beş Kitap', 'Beş kitap okudun.',
   '{"type":"books_read","threshold":5}'::jsonb, 3),
  ('c0000000-0000-0000-0000-000000000003', 'uc-gun-seri', 'Üç Gün Üst Üste', 'Üç gün ara vermeden okudun.',
   '{"type":"streak_days","threshold":3}'::jsonb, 2);

insert into public.children (id, owner_id, name, birth_date, gender, position) values
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Elif', '2020-05-01', 'girl', 0),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Kaan', '2018-02-11', 'boy', 0);

-- ═══ 1. Metin yardımcıları ═════════════════════════════════════════════════
do $$ begin raise notice '── 1. slugify ──'; end $$;
select pg_temp.assert_eq(public.slugify('Çaya Gelen Kaplan'), 'caya-gelen-kaplan', 'Türkçe karakterli slug');
select pg_temp.assert_eq(public.slugify('İşte O!'), 'iste-o', 'büyük İ ve noktalama');
select pg_temp.assert_eq(public.slugify('  Ağaç   Evi  '), 'agac-evi', 'boşluk temizliği');

-- ═══ 2. Türkçe tam metin arama ═════════════════════════════════════════════
do $$ begin raise notice '── 2. Arama ──'; end $$;
select pg_temp.assert_eq(
  (select count(*)::int from public.books
   where search_vector @@ public.build_search_query('caya')),
  1, 'aksansız arama ("caya" → "Çaya")');

select pg_temp.assert_eq(
  (select count(*)::int from public.books
   where search_vector @@ public.build_search_query('kaplan')),
  1, 'başlıkta arama');

-- Türkçe ek almış kelimeler önek eşleştirmesiyle bulunmalı.
select pg_temp.assert_eq(
  (select count(*)::int from public.books
   where search_vector @@ public.build_search_query('paylas')),
  1, 'ek almış kelime ("paylaşmayı" → "paylas")');
select pg_temp.assert_eq(
  (select count(*)::int from public.books
   where search_vector @@ public.build_search_query('kardesiyle')),
  1, 'uzun ek ("kardeşiyle" → "kardeş" içeren kitap)');
select pg_temp.assert(
  public.build_search_query('   ') is null,
  'boş sorgu null döner');
select pg_temp.assert(
  public.build_search_query('!!! & | ()') is null,
  'operatör karakterleri temizlenir');

select pg_temp.assert_eq(
  (select count(*)::int from public.books
   where search_vector @@ public.build_search_query('Judith')),
  1, 'yazar adıyla arama (tetikleyici ile eklendi)');

-- Yazar silinince arama vektöründen de düşmeli.
delete from public.book_contributors
where book_id = 'b0000000-0000-0000-0000-000000000001';
select pg_temp.assert_eq(
  (select count(*)::int from public.books
   where search_vector @@ public.build_search_query('Judith')),
  0, 'yazar silinince arama vektörü güncellenir');
insert into public.book_contributors (book_id, person_id, role)
values ('b0000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'author');

-- ═══ 3. Kütüphane kısıtları ════════════════════════════════════════════════
do $$ begin raise notice '── 3. Kısıtlar ──'; end $$;
do $$
begin
  begin
    insert into public.library_items (child_id, book_id, custom_book_id)
    values ('e0000000-0000-0000-0000-000000000001',
            'b0000000-0000-0000-0000-000000000001',
            gen_random_uuid());
    raise exception 'BAŞARISIZ: iki kaynak birden kabul edildi';
  exception when check_violation or foreign_key_violation then
    raise notice '  ✓ book_id ve custom_book_id birlikte reddedilir';
  end;

  begin
    insert into public.library_items (child_id) values ('e0000000-0000-0000-0000-000000000001');
    raise exception 'BAŞARISIZ: kaynaksız kayıt kabul edildi';
  exception when check_violation then
    raise notice '  ✓ kaynaksız kayıt reddedilir';
  end;

  begin
    insert into public.library_items (child_id, book_id, rating)
    values ('e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 9);
    raise exception 'BAŞARISIZ: 9 yıldız kabul edildi';
  exception when check_violation then
    raise notice '  ✓ 0-5 dışı puan reddedilir';
  end;
end $$;

-- ═══ 4. Okuma oturumu tetikleyicisi ════════════════════════════════════════
do $$ begin raise notice '── 4. Okuma oturumları ──'; end $$;
insert into public.library_items (id, child_id, book_id, status, added_from)
values ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001',
        'b0000000-0000-0000-0000-000000000001', 'to_read', 'catalog');

select pg_temp.assert_eq(
  (select times_read from public.library_items where id = 'f0000000-0000-0000-0000-000000000001'),
  0, 'başlangıçta okuma sayısı');

insert into public.reading_sessions (library_item_id, read_on) values
  ('f0000000-0000-0000-0000-000000000001', current_date - 2),
  ('f0000000-0000-0000-0000-000000000001', current_date - 1),
  ('f0000000-0000-0000-0000-000000000001', current_date);

select pg_temp.assert_eq(
  (select times_read from public.library_items where id = 'f0000000-0000-0000-0000-000000000001'),
  3, 'üç oturum sonrası okuma sayısı');
select pg_temp.assert_eq(
  (select status::text from public.library_items where id = 'f0000000-0000-0000-0000-000000000001'),
  'read', 'ilk oturumda durum "read" olur');
select pg_temp.assert_eq(
  (select first_read_at from public.library_items where id = 'f0000000-0000-0000-0000-000000000001'),
  current_date - 2, 'ilk okuma tarihi');
select pg_temp.assert_eq(
  (select last_read_at from public.library_items where id = 'f0000000-0000-0000-0000-000000000001'),
  current_date, 'son okuma tarihi');

delete from public.reading_sessions
where library_item_id = 'f0000000-0000-0000-0000-000000000001' and read_on = current_date;
select pg_temp.assert_eq(
  (select times_read from public.library_items where id = 'f0000000-0000-0000-0000-000000000001'),
  2, 'oturum silinince sayı düşer');

-- "yarım bırakıldı" durumu tetikleyici tarafından ezilmemeli.
update public.library_items set status = 'abandoned'
where id = 'f0000000-0000-0000-0000-000000000001';
insert into public.reading_sessions (library_item_id, read_on)
values ('f0000000-0000-0000-0000-000000000001', current_date);
select pg_temp.assert_eq(
  (select status::text from public.library_items where id = 'f0000000-0000-0000-0000-000000000001'),
  'abandoned', 'elle seçilen "abandoned" durumu korunur');

-- ═══ 5. Seri ve başarımlar ═════════════════════════════════════════════════
do $$ begin raise notice '── 5. Seri ve başarımlar ──'; end $$;
select pg_temp.assert_eq(
  public.child_reading_streak('e0000000-0000-0000-0000-000000000001'),
  3, 'en uzun ardışık gün serisi');

update public.library_items set rating = 5, status = 'read'
where id = 'f0000000-0000-0000-0000-000000000001';

select pg_temp.assert(
  public.evaluate_child_achievements('e0000000-0000-0000-0000-000000000001') >= 2,
  'başarımlar verildi (ilk kitap + üç gün seri)');
select pg_temp.assert_eq(
  (select count(*)::int from public.child_achievements
   where child_id = 'e0000000-0000-0000-0000-000000000001'),
  2, 'kazanılan başarım sayısı');
select pg_temp.assert_eq(
  (select count(*)::int from public.child_achievements
   where child_id = 'e0000000-0000-0000-0000-000000000001'
     and achievement_id = 'c0000000-0000-0000-0000-000000000002'),
  0, '5 kitap başarımı henüz verilmedi');

-- Tekrar çağırmak yeni başarım vermemeli.
select pg_temp.assert_eq(
  public.evaluate_child_achievements('e0000000-0000-0000-0000-000000000001'),
  0, 'tekrar değerlendirmede yeni başarım yok');

-- Puan: 1 puanlanmış kitap + (1 + 2) başarım puanı
select pg_temp.assert_eq(
  public.child_points('e0000000-0000-0000-0000-000000000001'),
  4, 'toplam yıldız puanı');

-- ═══ 6. Görünümler ═════════════════════════════════════════════════════════
do $$ begin raise notice '── 6. Görünümler ──'; end $$;
select pg_temp.assert_eq(
  (select array_length(author_names, 1) from public.catalog_books
   where slug = 'caya-gelen-kaplan'),
  1, 'catalog_books yazar listesi');
select pg_temp.assert_eq(
  (select topic_slugs[1] from public.catalog_books where slug = 'caya-gelen-kaplan'),
  'duygu-yonetimi', 'catalog_books konu listesi');
select pg_temp.assert_eq(
  (select jsonb_array_length(topics) from public.book_details where slug = 'caya-gelen-kaplan'),
  1, 'book_details konu ayrıntıları');
select pg_temp.assert_eq(
  (select books_read::int from public.child_reading_stats
   where child_id = 'e0000000-0000-0000-0000-000000000001'),
  1, 'child_reading_stats okunan kitap');

-- ═══ 7. RLS — veri yalıtımı ════════════════════════════════════════════════
do $$ begin raise notice '── 7. RLS ──'; end $$;

-- İzinler 0011_grants.sql'den gelmeli; burada elle GRANT YOK.
-- (Eskiden buradaydılar ve gerçek bir izin eksikliğini gizliyorlardı.)
select pg_temp.assert(
  has_table_privilege('anon', 'public.books', 'select'),
  'anon katalog tablosunu okuyabilir (GRANT var)');
select pg_temp.assert(
  has_table_privilege('anon', 'public.catalog_books', 'select'),
  'anon katalog görünümünü okuyabilir');
select pg_temp.assert(
  not has_table_privilege('anon', 'public.children', 'select'),
  'anon çocuk tablosuna hiç erişemez');
select pg_temp.assert(
  has_table_privilege('authenticated', 'public.library_items', 'insert'),
  'üye kütüphane kaydı ekleyebilir (GRANT var)');
select pg_temp.assert(
  not has_table_privilege('anon', 'public.library_items', 'select'),
  'anon kütüphane kayıtlarına erişemez');

-- Ayşe: kendi çocuğunu görür, Burak'ınkini görmez.
set role authenticated;
select pg_temp.login_as('a0000000-0000-0000-0000-000000000001');
select pg_temp.assert_eq((select count(*)::int from public.children), 1, 'Ayşe yalnızca kendi çocuğunu görür');
select pg_temp.assert_eq((select count(*)::int from public.library_items), 1, 'Ayşe yalnızca kendi kayıtlarını görür');
select pg_temp.assert_eq((select count(*)::int from public.reading_sessions), 3, 'Ayşe kendi oturumlarını görür');

select pg_temp.login_as('a0000000-0000-0000-0000-000000000002');
select pg_temp.assert_eq((select count(*)::int from public.children), 1, 'Burak yalnızca kendi çocuğunu görür');
select pg_temp.assert_eq((select count(*)::int from public.library_items), 0, 'Burak Ayşe''nin kayıtlarını göremez');
select pg_temp.assert_eq((select count(*)::int from public.reading_sessions), 0, 'Burak Ayşe''nin oturumlarını göremez');

-- Burak, Ayşe'nin çocuğuna kayıt ekleyemez.
do $$
begin
  begin
    insert into public.library_items (child_id, book_id)
    values ('e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002');
    raise exception 'BAŞARISIZ: başkasının çocuğuna kayıt eklendi';
  exception when insufficient_privilege then
    raise notice '  ✓ başkasının çocuğuna yazma engellendi';
  end;
end $$;

-- Anonim ziyaretçi: yayındaki kitapları görür, taslakları görmez.
reset role;
set role anon;
select pg_temp.login_as(null);
select pg_temp.assert_eq((select count(*)::int from public.books), 2, 'anonim yalnızca yayındaki kitapları görür');
select pg_temp.assert_eq((select count(*)::int from public.development_areas), 2, 'anonim rehberleri görür');
-- Takas ilanları ve çocuk profilleri anonime hiç açılmıyor: RLS'ten önce
-- GRANT düzeyinde engelleniyor, yani sorgu satır döndürmüyor değil, hata veriyor.
do $$
begin
  begin
    perform 1 from public.exchange_listings;
    raise exception 'BAŞARISIZ: anonim takas ilanlarını okuyabildi';
  exception when insufficient_privilege then
    raise notice '  ✓ anonim takas ilanlarına erişemez';
  end;

  begin
    perform 1 from public.children;
    raise exception 'BAŞARISIZ: anonim çocuk profillerini okuyabildi';
  exception when insufficient_privilege then
    raise notice '  ✓ anonim çocuk profillerine erişemez';
  end;
end $$;

-- Editör: taslakları da görür ve kitap yazabilir.
reset role;
set role authenticated;
select pg_temp.login_as('a0000000-0000-0000-0000-000000000003');
select pg_temp.assert_eq((select count(*)::int from public.books), 3, 'editör taslakları da görür');
insert into public.books (slug, title, summary, language, status)
values ('editor-kitabi', 'Editör Kitabı', 'Editör tarafından eklendi.', 'tr', 'published');
select pg_temp.assert_eq(
  (select count(*)::int from public.books where slug = 'editor-kitabi'),
  1, 'editör kitap ekleyebilir');

-- Normal üye kitap yazamaz.
select pg_temp.login_as('a0000000-0000-0000-0000-000000000001');
do $$
begin
  begin
    insert into public.books (slug, title, summary, language)
    values ('uye-kitabi', 'Üye Kitabı', 'Olmamalı.', 'tr');
    raise exception 'BAŞARISIZ: normal üye kitap ekledi';
  exception when insufficient_privilege then
    raise notice '  ✓ normal üye katalog yazamaz';
  end;
end $$;

reset role;
select pg_temp.login_as(null);

-- ═══ 8. Kullanıcı silme zinciri ════════════════════════════════════════════
-- Kullanıcı silinince tüm bağlı veri temizlenmeli. Bu, `supabase_auth_admin`
-- gibi public şemada izni olmayan bir rol tarafından da yapılabilmeli;
-- tetikleyiciler bu yüzden `security definer` (bkz. 0012).
do $$ begin raise notice '── 8. Kullanıcı silme ──'; end $$;

select pg_temp.assert(
  (select prosecdef from pg_proc where proname = 'sync_library_item_reading_stats'),
  'okuma istatistiği tetikleyicisi security definer');
select pg_temp.assert(
  (select prosecdef from pg_proc where proname = 'refresh_book_search_vector'),
  'arama vektörü tetikleyicisi security definer');

delete from auth.users where id = 'a0000000-0000-0000-0000-000000000001';

select pg_temp.assert_eq(
  (select count(*)::int from public.children where owner_id = 'a0000000-0000-0000-0000-000000000001'),
  0, 'çocuk profilleri silindi');
select pg_temp.assert_eq(
  (select count(*)::int from public.library_items), 0, 'kütüphane kayıtları silindi');
select pg_temp.assert_eq(
  (select count(*)::int from public.reading_sessions), 0, 'okuma oturumları silindi');
select pg_temp.assert_eq(
  (select count(*)::int from public.reading_notes), 0, 'notlar silindi');
select pg_temp.assert_eq(
  (select count(*)::int from public.profiles where id = 'a0000000-0000-0000-0000-000000000001'),
  0, 'profil silindi');
select pg_temp.assert(
  (select count(*) from public.books) > 0, 'katalog silinmedi');


-- ═══ 9. Fonksiyon yüzeyi (0013) ════════════════════════════════════════════
-- PostgREST `public` şemasındaki her fonksiyonu /rest/v1/rpc altında yayımlar.
-- İç kullanım fonksiyonları oraya sızmamalı; `search_path` sabit olmalı.
do $$ begin raise notice '── 9. Fonksiyon yüzeyi ──'; end $$;

select pg_temp.assert(
  not has_function_privilege('anon', 'public.refresh_book_search_vector(uuid)', 'execute'),
  'anon arama vektörü tazeleyicisini çağıramaz');

select pg_temp.assert(
  not has_function_privilege('authenticated', 'public.sync_library_item_reading_stats(uuid)', 'execute'),
  'üye okuma istatistiği güncelleyicisini çağıramaz');

select pg_temp.assert(
  not has_function_privilege('anon', 'public.handle_new_user()', 'execute'),
  'anon kayıt tetikleyicisini çağıramaz');

select pg_temp.assert(
  not has_function_privilege('anon', 'public.child_points(uuid)', 'execute'),
  'anon çocuk puanını sorgulayamaz');

select pg_temp.assert(
  has_function_privilege('authenticated', 'public.child_points(uuid)', 'execute'),
  'üye çocuk puanını sorgulayabilir');

-- RLS politikaları bu yardımcıları çağırıyor; EXECUTE geri alınırsa katalog
-- sayfası komple kırılır (bkz. 0013 başlığındaki not).
select pg_temp.assert(
  has_function_privilege('anon', 'public.is_staff()', 'execute'),
  'anon is_staff çağırabilir (RLS politikası kullanıyor)');

select pg_temp.assert(
  (select count(*) = 5 from pg_proc
   where pronamespace = 'public'::regnamespace
     and proname in ('build_search_query', 'set_updated_at', 'slugify',
                     'child_reading_streak', 'child_points')
     and proconfig is not null),
  'denetçinin işaretlediği 5 fonksiyonda search_path sabit');

-- ═══ 10. Bekleyen rol atamaları (0015) ════════════════════════════════════
do $$ begin raise notice '── 10. Bekleyen rol atamaları ──'; end $$;

-- Listedeki adresle kayıt olan kişi rolü otomatik almalı.
insert into public.pending_role_grants (email, role, note)
values ('yeni-yonetici@example.com', 'admin', 'test');

insert into auth.users (id, email) values ('a0000000-0000-0000-0000-0000000000aa', 'yeni-yonetici@example.com');

select pg_temp.assert_eq(
  (select count(*)::int from public.user_roles
   where user_id = 'a0000000-0000-0000-0000-0000000000aa' and role = 'admin'),
  1, 'listedeki adres kayıt olunca yönetici oldu');

-- Büyük/küçük harf farkı engel olmamalı (citext).
insert into public.pending_role_grants (email, role) values ('KaRiSiK@Example.COM', 'editor');
insert into auth.users (id, email) values ('a0000000-0000-0000-0000-0000000000bb', 'karisik@example.com');

select pg_temp.assert_eq(
  (select count(*)::int from public.user_roles
   where user_id = 'a0000000-0000-0000-0000-0000000000bb' and role = 'editor'),
  1, 'e-posta eşleşmesi harf duyarsız');

-- Listede olmayan kayıt rol almamalı.
insert into auth.users (id, email) values ('a0000000-0000-0000-0000-0000000000cc', 'sirada-yok@example.com');

select pg_temp.assert_eq(
  (select count(*)::int from public.user_roles
   where user_id = 'a0000000-0000-0000-0000-0000000000cc'),
  0, 'listede olmayan kullanıcı rol almadı');

-- Kişi önce kayıt olduysa, listeye sonradan eklenince geriye dönük uygulanır.
insert into public.pending_role_grants (email, role) values ('sirada-yok@example.com', 'editor');
select public.apply_pending_role_grants();
select pg_temp.assert_eq(
  (select count(*)::int from public.user_roles
   where user_id = 'a0000000-0000-0000-0000-0000000000cc' and role = 'editor'),
  1, 'sonradan listeye eklenen mevcut kullanıcıya da uygulandı');

-- Tekrar çalıştırmak çift kayıt üretmemeli.
select public.apply_pending_role_grants();
select pg_temp.assert_eq(
  (select count(*)::int from public.user_roles
   where user_id = 'a0000000-0000-0000-0000-0000000000cc'),
  1, 'tekrar uygulama çift kayıt üretmiyor');

-- Liste yalnızca yöneticilere görünmeli.
select pg_temp.assert(
  not has_table_privilege('anon', 'public.pending_role_grants', 'select'),
  'anon bekleyen yetki listesini okuyamaz');

delete from auth.users where id in ('a0000000-0000-0000-0000-0000000000aa',
                                    'a0000000-0000-0000-0000-0000000000bb',
                                    'a0000000-0000-0000-0000-0000000000cc');
delete from public.pending_role_grants
where email in ('yeni-yonetici@example.com', 'KaRiSiK@Example.COM', 'sirada-yok@example.com');

-- ═══ 11. Çocuk doğum tarihi kısıtı (0016) ═════════════════════════════════
-- Kısıt yalnızca "gelecekte doğulamaz" der; 18 yaş kuralı formda (bkz. 0016).
do $$ begin raise notice '── 11. Doğum tarihi kısıtı ──'; end $$;

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-0000000000d1', 'tarih@ornek.com');

-- Makul tarih kabul edilmeli.
insert into public.children (owner_id, name, birth_date)
values ('a0000000-0000-0000-0000-0000000000d1', 'Normal', current_date - 2000);
select pg_temp.assert_eq(
  (select count(*)::int from public.children
   where owner_id = 'a0000000-0000-0000-0000-0000000000d1'), 1, 'makul doğum tarihi kabul edildi');

-- 2000 öncesi ARTIK kabul edilmeli (eski kısıt bunu reddediyordu).
insert into public.children (owner_id, name, birth_date)
values ('a0000000-0000-0000-0000-0000000000d1', 'Eski', date '1995-05-10');
select pg_temp.assert_eq(
  (select count(*)::int from public.children
   where owner_id = 'a0000000-0000-0000-0000-0000000000d1' and name = 'Eski'),
  1, '2000 öncesi tarih artık veritabanında serbest');

-- Boş tarih serbest (sütun nullable).
insert into public.children (owner_id, name, birth_date)
values ('a0000000-0000-0000-0000-0000000000d1', 'Tarihsiz', null);
select pg_temp.assert_eq(
  (select count(*)::int from public.children
   where owner_id = 'a0000000-0000-0000-0000-0000000000d1' and birth_date is null),
  1, 'doğum tarihi boş bırakılabilir');

-- İleri tarih hâlâ reddedilmeli.
do $$
begin
  insert into public.children (owner_id, name, birth_date)
  values ('a0000000-0000-0000-0000-0000000000d1', 'Gelecek', current_date + 1);
  raise exception 'BAŞARISIZ: ileri doğum tarihi kabul edildi';
exception
  when check_violation then
    raise notice '  ✓ ileri doğum tarihi reddedildi';
end $$;

delete from auth.users where id = 'a0000000-0000-0000-0000-0000000000d1';

-- ═══ 12. Okuma sayacı tutarlılığı (0017) ══════════════════════════════════
-- Tek işlemde art arda eklenen oturumlar için sayaç doğru olmalı.
-- (Gerçek eşzamanlılık tek bağlantıdan test edilemez; kilidin varlığını
--  ayrıca doğruluyoruz.)
do $$ begin raise notice '── 12. Okuma sayacı ──'; end $$;

insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-0000000000e1', 'sayac@ornek.com');
insert into public.children (id, owner_id, name)
values ('a0000000-0000-0000-0000-0000000000e2',
        'a0000000-0000-0000-0000-0000000000e1', 'Sayaç');

insert into public.library_items (id, child_id, book_id, status)
select 'a0000000-0000-0000-0000-0000000000e3',
       'a0000000-0000-0000-0000-0000000000e2', id, 'to_read'
from public.books limit 1;

insert into public.reading_sessions (library_item_id, read_on) values
  ('a0000000-0000-0000-0000-0000000000e3', current_date),
  ('a0000000-0000-0000-0000-0000000000e3', current_date - 1),
  ('a0000000-0000-0000-0000-0000000000e3', current_date - 2);

select pg_temp.assert_eq(
  (select times_read from public.library_items
   where id = 'a0000000-0000-0000-0000-0000000000e3'),
  3, 'üç oturum sonrası sayaç 3');

select pg_temp.assert_eq(
  (select count(*)::int from public.reading_sessions
   where library_item_id = 'a0000000-0000-0000-0000-0000000000e3'),
  3, 'oturum satırları da 3');

-- Oturum silinince sayaç geri düşmeli.
delete from public.reading_sessions
where library_item_id = 'a0000000-0000-0000-0000-0000000000e3'
  and read_on = current_date - 2;
select pg_temp.assert_eq(
  (select times_read from public.library_items
   where id = 'a0000000-0000-0000-0000-0000000000e3'),
  2, 'oturum silinince sayaç düştü');

-- Oturum eklenince durum otomatik "okundu" olmalı.
select pg_temp.assert(
  (select status = 'read' from public.library_items
   where id = 'a0000000-0000-0000-0000-0000000000e3'),
  'oturum eklenince durum okundu oldu');

-- Kilit gerçekten fonksiyonun içinde mi? (0017'nin özü bu.)
select pg_temp.assert(
  (select prosrc like '%for no key update%' from pg_proc
   where proname = 'sync_library_item_reading_stats'
     and pronamespace = 'public'::regnamespace),
  'sayım öncesi for no key update kilidi alınıyor');

delete from auth.users where id = 'a0000000-0000-0000-0000-0000000000e1';

-- ═══ 13. Yönetim panosu sayıları (0018) ═══════════════════════════════════
-- Sayı görünür, satır görünmez: yönetici kaç profil olduğunu bilmeli ama
-- çocukların adlarına erişememeli (PRD ilke 2).
do $$ begin raise notice '── 13. Panel sayıları ──'; end $$;

-- Kurulum yazımları için tam yetki gerekiyor.
reset role;
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-0000000000f1', 'panel-admin@ornek.com'),
  ('a0000000-0000-0000-0000-0000000000f2', 'panel-uye@ornek.com');
insert into public.user_roles (user_id, role)
values ('a0000000-0000-0000-0000-0000000000f1', 'admin');
insert into public.children (owner_id, name)
values ('a0000000-0000-0000-0000-0000000000f2', 'Panel Çocuk');

-- RLS yalnızca `authenticated` rolünde uygulanır; süper kullanıcı baypas eder.
set role authenticated;
select pg_temp.login_as('a0000000-0000-0000-0000-0000000000f1');
select pg_temp.assert(
  (public.platform_stats() -> 'children')::int >= 1,
  'yönetici toplam çocuk sayısını görüyor');

-- Sayıyı görmek satırları görmek değildir.
select pg_temp.assert_eq(
  (select count(*)::int from public.children), 0,
  'yönetici çocuk SATIRLARINI göremiyor (yalnızca sayı)');

-- Yönetici olmayan hiç çağıramamalı.
select pg_temp.login_as('a0000000-0000-0000-0000-0000000000f2');
do $$
begin
  perform public.platform_stats();
  raise exception 'BAŞARISIZ: üye panel sayılarını okuyabildi';
exception
  when insufficient_privilege then
    raise notice '  ✓ üye panel sayılarını okuyamıyor';
end $$;

set role anon;
select pg_temp.login_as(null);
do $$
begin
  perform public.platform_stats();
  raise exception 'BAŞARISIZ: anonim panel sayılarını okuyabildi';
exception
  when insufficient_privilege then
    raise notice '  ✓ anonim panel sayılarını okuyamıyor';
end $$;

reset role;
delete from auth.users where id in ('a0000000-0000-0000-0000-0000000000f1',
                                    'a0000000-0000-0000-0000-0000000000f2');

-- ═══ 14. Yapay zekâ öneri geçmişi (0019) ══════════════════════════════════
-- Niyet metni ebeveynin özel bilgisi; kimse başkasınınkini görmemeli.
do $$ begin raise notice '── 14. Öneri geçmişi ──'; end $$;

reset role;
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-0000000000c1', 'oneri1@ornek.com'),
  ('a0000000-0000-0000-0000-0000000000c2', 'oneri2@ornek.com');
insert into public.children (id, owner_id, name)
values ('a0000000-0000-0000-0000-0000000000c3',
        'a0000000-0000-0000-0000-0000000000c1', 'Öneri Çocuk');

set role authenticated;
select pg_temp.login_as('a0000000-0000-0000-0000-0000000000c1');

insert into public.ai_recommendations (user_id, child_id, mode, prompt, results, source)
values ('a0000000-0000-0000-0000-0000000000c1', 'a0000000-0000-0000-0000-0000000000c3',
        'sakin', 'kardeşi olacak', '[{"bookId":"x","reason":"y"}]'::jsonb, 'ai');

select pg_temp.assert_eq(
  (select count(*)::int from public.ai_recommendations), 1, 'kendi geçmişini görüyor');

-- Profil olmadan da kayıt açılabilmeli (ADR 0007: çocuk zorunlu değil).
insert into public.ai_recommendations (user_id, mode, results)
values ('a0000000-0000-0000-0000-0000000000c1', 'eglence', '[]'::jsonb);
select pg_temp.assert_eq(
  (select count(*)::int from public.ai_recommendations where child_id is null),
  1, 'çocuk profili olmadan da kayıt açılıyor');

-- Başkasının adına kayıt açılamamalı.
do $$
begin
  insert into public.ai_recommendations (user_id, results)
  values ('a0000000-0000-0000-0000-0000000000c2', '[]'::jsonb);
  raise exception 'BAŞARISIZ: başkası adına öneri kaydı açıldı';
exception
  when insufficient_privilege then
    raise notice '  ✓ başkası adına kayıt açılamıyor';
end $$;

-- İkinci kullanıcı ilkinin geçmişini görmemeli.
select pg_temp.login_as('a0000000-0000-0000-0000-0000000000c2');
select pg_temp.assert_eq(
  (select count(*)::int from public.ai_recommendations), 0,
  'başkasının öneri geçmişi görünmüyor');

-- `results` dizi olmak zorunda.
select pg_temp.login_as('a0000000-0000-0000-0000-0000000000c1');
do $$
begin
  insert into public.ai_recommendations (user_id, results)
  values ('a0000000-0000-0000-0000-0000000000c1', '{"a":1}'::jsonb);
  raise exception 'BAŞARISIZ: dizi olmayan results kabul edildi';
exception
  when check_violation then
    raise notice '  ✓ results dizi olmak zorunda';
end $$;

-- Çocuk silinince geçmiş kaybolmamalı (on delete set null).
reset role;
delete from public.children where id = 'a0000000-0000-0000-0000-0000000000c3';
select pg_temp.assert_eq(
  (select count(*)::int from public.ai_recommendations
   where user_id = 'a0000000-0000-0000-0000-0000000000c1'),
  2, 'çocuk silinince geçmiş korunuyor');

select pg_temp.assert(
  not has_table_privilege('anon', 'public.ai_recommendations', 'select'),
  'anon öneri geçmişine erişemiyor');

delete from auth.users where id in ('a0000000-0000-0000-0000-0000000000c1',
                                    'a0000000-0000-0000-0000-0000000000c2');

do $$ begin raise notice ''; raise notice 'TÜM ŞEMA TESTLERİ GEÇTİ'; end $$;
