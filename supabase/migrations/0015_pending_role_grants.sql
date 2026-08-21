-- ═══════════════════════════════════════════════════════════════════════════
-- 0015 — Kayıt olmadan önce rol atama
--
-- SORUN: Yöneticiyi belirlemenin tek yolu, kişi kayıt olduktan SONRA elle
-- `user_roles`'a satır eklemekti. Yeni bir projede bu bir tavuk-yumurta
-- sorunu: kimse yönetici değilken yönetim arayüzüne kimse giremiyor ve
-- ilk yetkiyi vermek için SQL çalıştırmak gerekiyor.
--
-- ÇÖZÜM: E-posta bazlı bir bekleyen-yetki listesi. Listedeki adresle kayıt
-- olan kişiye rol otomatik verilir. Kayıt sırası önemli değil — kişi listeye
-- eklenmeden önce de kayıt olmuş olabilir, `apply_pending_role_grants()`
-- geriye dönük de çalışır.
--
-- E-posta `citext` olduğu için büyük/küçük harf farkı sorun çıkarmaz.
-- ═══════════════════════════════════════════════════════════════════════════

create table public.pending_role_grants (
  email extensions.citext primary key,
  role public.app_role not null default 'admin',
  note text,                       -- "kurucu", "içerik editörü" gibi
  created_at timestamptz not null default now()
);

comment on table public.pending_role_grants is
  'Bu adreslerle kayıt olan kullanıcılara belirtilen rol otomatik verilir.';

-- ─── Bekleyen yetkileri uygula ─────────────────────────────────────────────
-- Hem tetikleyiciden (tek kullanıcı) hem elle (hepsi) çağrılabilir.
create or replace function public.apply_pending_role_grants(target_user_id uuid default null)
returns integer
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
declare
  granted integer;
begin
  insert into public.user_roles (user_id, role)
  select u.id, g.role
  from auth.users u
  -- DİKKAT: `u.email` metin (auth.users'da varchar). `citext = text`
  -- karşılaştırmasında PostgreSQL citext'i text'e çevirmeyi tercih eder
  -- (o yön örtük cast'tir) ve eşleşme HARF DUYARLI olur. Açık cast şart.
  join public.pending_role_grants g on g.email = u.email::extensions.citext
  where target_user_id is null or u.id = target_user_id
  on conflict (user_id, role) do nothing;

  get diagnostics granted = row_count;
  return granted;
end;
$$;

-- ─── Kayıt tetikleyicisini genişlet ────────────────────────────────────────
-- Profil oluşturma davranışı aynı; sonuna rol ataması eklendi.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name',
                         new.raw_user_meta_data ->> 'full_name', '')), '')
  )
  on conflict (id) do nothing;

  perform public.apply_pending_role_grants(new.id);

  return new;
end;
$$;

-- ═══ RLS ═══════════════════════════════════════════════════════════════════
-- Yalnızca yöneticiler görebilir ve düzenleyebilir. Tetikleyici `security
-- definer` olduğu için politikalara takılmadan okur.
alter table public.pending_role_grants enable row level security;

create policy "pending_role_grants_admin_read" on public.pending_role_grants
  for select to authenticated using ((select public.is_admin()));
create policy "pending_role_grants_admin_insert" on public.pending_role_grants
  for insert to authenticated with check ((select public.is_admin()));
create policy "pending_role_grants_admin_update" on public.pending_role_grants
  for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "pending_role_grants_admin_delete" on public.pending_role_grants
  for delete to authenticated using ((select public.is_admin()));

grant select, insert, update, delete on public.pending_role_grants to authenticated;

-- İç kullanım: REST yüzeyinde durmasına gerek yok (bkz. 0013).
revoke execute on function public.apply_pending_role_grants(uuid)
  from public, anon, authenticated;

-- ─── Kurucular ─────────────────────────────────────────────────────────────
insert into public.pending_role_grants (email, role, note) values
  ('sibelhaciog@gmail.com', 'admin', 'Proje sahibi'),
  ('mehmet@nekovix.com', 'admin', 'Teknik danışman')
on conflict (email) do update set role = excluded.role, note = excluded.note;

-- Zaten kayıtlı olanlar varsa onlara da uygula.
select public.apply_pending_role_grants();
