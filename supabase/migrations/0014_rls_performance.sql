-- ═══════════════════════════════════════════════════════════════════════════
-- 0014 — RLS başarım düzeltmeleri (Supabase başarım denetçisi bulguları)
--
-- ÜÇ AYRI SORUN:
--
-- 1) `auth_rls_initplan` — Politika ifadesindeki `auth.uid()` HER SATIR için
--    yeniden çağrılıyordu. `(select auth.uid())` biçiminde sarınca PostgreSQL
--    bunu bir InitPlan'a çeviriyor ve sorgu başına BİR kez hesaplıyor.
--    Aynı şey `is_staff()` / `is_admin()` için de geçerli — üstelik onlar
--    `user_roles` tablosuna gidiyor, yani satır başına bir sorgu demekti.
--
--    `owns_child(child_id)` ve `owns_library_item(...)` BİLİNÇLİ olarak
--    sarılmadı: argümanları satırdan geliyor, dolayısıyla ilişkili
--    (correlated) alt sorgu olurlar ve InitPlan'a dönüşmezler.
--
-- 2) `multiple_permissive_policies` — Katalog tablolarında `_public_read`
--    (FOR SELECT) ile `_staff_write` (FOR ALL) çakışıyordu. FOR ALL SELECT'i
--    de kapsadığı için her okumada iki politika değerlendirilip OR'lanıyordu.
--    Yazma politikaları INSERT/UPDATE/DELETE olarak ayrıldı; okuma tarafında
--    tek politika kaldı. Personelin taslakları görmesi zaten `_public_read`
--    içindeki `is_staff()` dalıyla sağlanıyor, davranış değişmiyor.
--
-- 3) `unindexed_foreign_keys` — Ebeveyn satır silindiğinde PostgreSQL
--    referans veren tabloyu taramak zorunda. Tablolar küçük ama indeksler de
--    küçük; taksonomi düzenlemesi ve hesap silme yollarını rahatlatıyor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1) Katalog/taksonomi: FOR ALL → INSERT + UPDATE + DELETE ──────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'achievements', 'book_contributors', 'book_interests', 'book_topics',
    'books', 'development_areas', 'development_topics', 'donation_organizations',
    'interests', 'people', 'publishers', 'series'
  ]
  loop
    execute format('drop policy if exists %I on public.%I', t || '_staff_write', t);

    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check ((select public.is_staff()))',
      t || '_staff_insert', t);

    execute format(
      'create policy %I on public.%I for update to authenticated
         using ((select public.is_staff())) with check ((select public.is_staff()))',
      t || '_staff_update', t);

    execute format(
      'create policy %I on public.%I for delete to authenticated
         using ((select public.is_staff()))',
      t || '_staff_delete', t);
  end loop;
end $$;

-- `user_roles` aynı desende ama yönetici yetkisi arıyor.
drop policy if exists "user_roles_admin_write" on public.user_roles;
create policy "user_roles_admin_insert" on public.user_roles
  for insert to authenticated with check ((select public.is_admin()));
create policy "user_roles_admin_update" on public.user_roles
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "user_roles_admin_delete" on public.user_roles
  for delete to authenticated using ((select public.is_admin()));

-- ─── 2) Okuma politikalarında is_staff() çağrısını InitPlan'a al ───────────
drop policy if exists "books_public_read" on public.books;
create policy "books_public_read" on public.books
  for select using (status = 'published' or (select public.is_staff()));

drop policy if exists "donation_organizations_public_read" on public.donation_organizations;
create policy "donation_organizations_public_read" on public.donation_organizations
  for select using (is_active or (select public.is_staff()));

-- ─── 3) auth.uid() çağrılarını InitPlan'a al ───────────────────────────────

drop policy if exists "profiles_read_own" on public.profiles;
create policy "profiles_read_own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "children_own" on public.children;
create policy "children_own" on public.children
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "custom_books_own" on public.custom_books;
create policy "custom_books_own" on public.custom_books
  for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists "user_roles_read_own" on public.user_roles;
create policy "user_roles_read_own" on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "feedback_read_own" on public.feedback;
create policy "feedback_read_own" on public.feedback
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "donation_requests_read_own" on public.donation_requests;
create policy "donation_requests_read_own" on public.donation_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "donation_requests_insert_own" on public.donation_requests;
create policy "donation_requests_insert_own" on public.donation_requests
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "ai_usage_read_own" on public.ai_usage_events;
create policy "ai_usage_read_own" on public.ai_usage_events
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "ai_usage_insert_own" on public.ai_usage_events;
create policy "ai_usage_insert_own" on public.ai_usage_events
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "exchange_listings_read_authenticated" on public.exchange_listings;
create policy "exchange_listings_read_authenticated" on public.exchange_listings
  for select to authenticated
  using (
    (status = 'active' and expires_at > now())
    or owner_id = (select auth.uid())
    or (select public.is_staff())
  );

drop policy if exists "exchange_listings_insert_own" on public.exchange_listings;
create policy "exchange_listings_insert_own" on public.exchange_listings
  for insert to authenticated with check (owner_id = (select auth.uid()));

drop policy if exists "exchange_listings_update_own" on public.exchange_listings;
create policy "exchange_listings_update_own" on public.exchange_listings
  for update to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_staff()))
  with check (owner_id = (select auth.uid()) or (select public.is_staff()));

drop policy if exists "exchange_listings_delete_own" on public.exchange_listings;
create policy "exchange_listings_delete_own" on public.exchange_listings
  for delete to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_staff()));

-- ─── 4) Örtüsüz yabancı anahtarlara indeks ─────────────────────────────────
create index if not exists books_publisher_idx on public.books (publisher_id);
create index if not exists series_publisher_idx on public.series (publisher_id);
create index if not exists child_achievements_achievement_idx
  on public.child_achievements (achievement_id);
create index if not exists child_focus_topics_topic_idx
  on public.child_focus_topics (topic_id);
create index if not exists child_interests_interest_idx
  on public.child_interests (interest_id);
create index if not exists custom_books_matched_idx
  on public.custom_books (matched_book_id);
create index if not exists library_items_custom_book_idx
  on public.library_items (custom_book_id);
create index if not exists donation_requests_organization_idx
  on public.donation_requests (organization_id);
create index if not exists exchange_listings_book_idx
  on public.exchange_listings (book_id);
create index if not exists feedback_user_idx on public.feedback (user_id);
create index if not exists user_roles_granted_by_idx on public.user_roles (granted_by);
