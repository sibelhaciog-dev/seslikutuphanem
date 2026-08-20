-- ═══════════════════════════════════════════════════════════════════════════
-- 0008 — Depolama kovaları
--
-- catalog-covers : editörün yüklediği resmî kitap kapakları
-- user-covers    : ebeveynin kendi çektiği kapak fotoğrafları ({uid}/... )
--
-- İkisi de herkese açık okunur (kapaklar gizli veri değil); yazma yetkisi
-- kısıtlı.
-- ═══════════════════════════════════════════════════════════════════════════

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('catalog-covers', 'catalog-covers', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('user-covers', 'user-covers', true, 3145728,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- ─── catalog-covers ────────────────────────────────────────────────────────
drop policy if exists "catalog_covers_public_read" on storage.objects;
create policy "catalog_covers_public_read" on storage.objects
  for select using (bucket_id = 'catalog-covers');

drop policy if exists "catalog_covers_staff_write" on storage.objects;
create policy "catalog_covers_staff_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'catalog-covers' and public.is_staff())
  with check (bucket_id = 'catalog-covers' and public.is_staff());

-- ─── user-covers ───────────────────────────────────────────────────────────
-- Yol düzeni: {user_id}/{kitap-slug veya custom_book_id}.jpg
drop policy if exists "user_covers_public_read" on storage.objects;
create policy "user_covers_public_read" on storage.objects
  for select using (bucket_id = 'user-covers');

drop policy if exists "user_covers_insert_own" on storage.objects;
create policy "user_covers_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'user-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_covers_update_own" on storage.objects;
create policy "user_covers_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'user-covers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'user-covers' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "user_covers_delete_own" on storage.objects;
create policy "user_covers_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'user-covers' and (storage.foldername(name))[1] = auth.uid()::text);
