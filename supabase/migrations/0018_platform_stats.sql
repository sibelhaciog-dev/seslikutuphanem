-- ═══════════════════════════════════════════════════════════════════════════
-- 0018 — Yönetim panosu için toplam sayılar
--
-- SORUN: Panodaki "Çocuk profili" kartı her zaman 0 gösteriyordu. `children`
-- tablosunun RLS politikası sahibiyle sınırlı (`owner_id = auth.uid()`) ve
-- personel için bir istisna yok — yani "toplam" sanılan sayı aslında yalnızca
-- yöneticinin kendi çocuklarını sayıyordu. Yanlış veri, hiç veri olmamasından
-- kötüdür.
--
-- ÇÖZÜM SEÇENEĞİ NEDEN BU: `children` üzerine personel okuma politikası
-- eklemek sayıyı düzeltirdi ama bedeli ağır olurdu — editörler bütün
-- çocukların adını, doğum tarihini ve notlarını görebilirdi. Bir çocuk
-- kitapları uygulamasında bu kabul edilemez (PRD ilke 2: varsayılan gizlilik).
--
-- Bunun yerine yalnızca SAYIYI döndüren, satır döndürmeyen bir fonksiyon.
-- Yönetici kaç profil olduğunu görür, kimin olduğunu göremez.
-- ═══════════════════════════════════════════════════════════════════════════

create or replace function public.platform_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- Definer olduğu için RLS'i baypas ediyor; yetkiyi elle kontrol etmek şart.
  if not public.is_admin() then
    raise exception 'yetkisiz' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'children', (select count(*) from public.children where archived_at is null),
    'parents', (select count(*) from public.profiles),
    'library_items', (select count(*) from public.library_items),
    'reading_sessions', (select count(*) from public.reading_sessions)
  );
end;
$$;

revoke execute on function public.platform_stats() from public, anon;
grant execute on function public.platform_stats() to authenticated;
