-- ═══════════════════════════════════════════════════════════════════════════
-- 0017 — Okuma istatistiği sayımını serileştir
--
-- SORUN: "+ Bugün okuduk" düğmesine hızlıca üç kez basıldığında veritabanında
-- 3 `reading_sessions` satırı oluşuyor ama `times_read` 2 kalıyordu. Geçici
-- bir tutarsızlık değil; kalıcı olarak yanlış.
--
-- SEBEP: Tetikleyici her satır için `count(*)` ile yeniden sayıyor. Eşzamanlı
-- işlemler READ COMMITTED altında ayrı anlık görüntülerle çalışıyor: ikinci
-- işlem sayarken birinci henüz commit etmemiş olabiliyor, dolayısıyla onu
-- göremiyor. En son commit eden, eksik sayıyı yazıp üzerine biniyor
-- (kayıp güncelleme).
--
-- ÇÖZÜM: Saymadan önce ilgili `library_items` satırını kilitle. İkinci işlem
-- kilidi beklerken birinci commit eder; READ COMMITTED'da kilit alındıktan
-- sonraki `select` yeni bir anlık görüntü aldığı için artık birinci işlemin
-- satırını da görür. Sayım doğru olur.
--
-- KİLİT GÜCÜ ÖNEMLİ — `for update` DEĞİL, `for no key update`:
-- `reading_sessions` eklerken yabancı anahtar kontrolü zaten ilgili
-- `library_items` satırında `for key share` kilidi tutuyor. Tetikleyici
-- üstüne `for update` isterse iki işlem birbirini bekler ve deadlock olur
-- (8 eşzamanlı ekleme ile denendi: 7'si deadlock'a düştü).
-- `for no key update` ise `for key share` ile ÇAKIŞMAZ, ama kendisiyle
-- çakışır — yani yazarları birbirine karşı sıraya sokar, okuyucuları
-- engellemez. Tam olarak istediğimiz bu.
--
-- Aynı sebeple sondaki `update` de zaten `for no key update` gücünde
-- kilit alıyor (birincil anahtarı değiştirmiyor); yani ek bir çakışma yok.
--
-- Not: kullanıcı arayüzü de düzeltildi — istek sürerken düğme devre dışı,
-- yani çift tıklama zaten istek üretmiyor. Bu kısıt ikinci savunma hattı:
-- iki farklı sekme ya da cihaz aynı anda kaydedebilir.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.sync_library_item_reading_stats(target_item_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  session_count integer;
  first_date date;
  last_date date;
begin
  -- Aynı kütüphane kaydı için eşzamanlı tetikleyicileri sıraya sok.
  perform 1 from public.library_items where id = target_item_id for no key update;

  select count(*), min(read_on), max(read_on)
  into session_count, first_date, last_date
  from public.reading_sessions
  where library_item_id = target_item_id;

  update public.library_items
  set times_read = session_count,
      first_read_at = first_date,
      last_read_at = last_date,
      status = case
        when session_count > 0 and status in ('to_read', 'reading') then 'read'
        else status
      end
  where id = target_item_id;
end;
$$;
