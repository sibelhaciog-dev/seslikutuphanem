-- ═══════════════════════════════════════════════════════════════════════════
-- 0011 — Rol izinleri (GRANT)
--
-- RLS "hangi SATIRLAR" sorusunu cevaplar; GRANT "hangi TABLOYA hiç
-- dokunabilir" sorusunu. İkisi ayrı katmandır ve ikisi de gereklidir:
-- politikası olan ama GRANT'i olmayan tablo "permission denied" verir.
--
-- Buradaki izinler kasıtlı olarak geniştir (tablo düzeyi); asıl daraltmayı
-- satır düzeyinde politikalar yapar. Yine de her tablo tek tek yazılmıştır ki
-- yeni bir tablo eklendiğinde izin vermeyi unutmak fark edilsin.
-- ═══════════════════════════════════════════════════════════════════════════

grant usage on schema public to anon, authenticated;

-- ─── Herkese açık okuma (katalog + taksonomi) ──────────────────────────────
grant select on
  public.development_areas,
  public.development_topics,
  public.interests,
  public.publishers,
  public.people,
  public.series,
  public.books,
  public.book_contributors,
  public.book_topics,
  public.book_interests,
  public.achievements,
  public.donation_organizations,
  public.catalog_books,
  public.book_details
to anon, authenticated;

-- ─── Editör yazma (satır düzeyinde is_staff() ile korunuyor) ───────────────
grant insert, update, delete on
  public.development_areas,
  public.development_topics,
  public.interests,
  public.publishers,
  public.people,
  public.series,
  public.books,
  public.book_contributors,
  public.book_topics,
  public.book_interests,
  public.achievements,
  public.donation_organizations
to authenticated;

-- ─── Kullanıcının kendi verisi ─────────────────────────────────────────────
grant select, insert, update, delete on
  public.profiles,
  public.children,
  public.child_interests,
  public.child_focus_topics,
  public.custom_books,
  public.library_items,
  public.reading_sessions,
  public.reading_notes,
  public.child_achievements,
  public.exchange_listings
to authenticated;

grant select on public.child_reading_stats to authenticated;

-- Roller yalnızca okunabilir; yazma yetkisi politika ile yöneticide.
grant select, insert, update, delete on public.user_roles to authenticated;

-- ─── Yalnızca yazılıp geri okunanlar ───────────────────────────────────────
grant select, insert on public.feedback to authenticated;
grant update on public.feedback to authenticated;          -- politika: yalnızca editör
grant select, insert on public.donation_requests to authenticated;
grant update on public.donation_requests to authenticated; -- politika: yalnızca editör
grant select, insert on public.ai_usage_events to authenticated;

-- ─── Fonksiyonlar ──────────────────────────────────────────────────────────
grant execute on function public.build_search_query(text) to anon, authenticated;
grant execute on function public.child_points(uuid) to authenticated;
grant execute on function public.child_reading_streak(uuid) to authenticated;
grant execute on function public.evaluate_child_achievements(uuid) to authenticated;
grant execute on function public.ai_quota_remaining(text, integer, integer) to authenticated;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.owns_child(uuid) to authenticated;
grant execute on function public.owns_library_item(uuid) to authenticated;
