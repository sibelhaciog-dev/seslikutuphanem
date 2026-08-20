/**
 * Yerel Supabase üzerinde uçtan uca duman testi.
 *
 *   npx supabase start     # yerel yığını başlat
 *   npm run db:sync:local  # içeriği yükle
 *   npm run test:e2e       # bu betik
 *
 * Birim testlerinin göremediği katmanı doğrular: gerçek PostgREST, gerçek
 * kimlik doğrulama, gerçek RLS ve tetikleyiciler. Şema testleri (db:test) SQL
 * düzeyinde çalışır; bu betik uygulamanın kullandığı yoldan geçer.
 *
 * Anahtarlar `supabase start` çıktısındaki sabit yerel değerlerdir; üretimle
 * ilgisi yoktur.
 */
import { execFileSync } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

/**
 * Yerel yığının adres ve anahtarlarını bulur.
 *
 * Anahtarlar depoda TUTULMAZ. `supabase start` her seferinde aynı sabit
 * geliştirme anahtarlarını üretir ama bunlar yine de gizli anahtar biçiminde
 * olduğu için depo tarayıcıları tarafından işaretlenir. Bu yüzden çalışma
 * anında `supabase status` çıktısından okunur; istenirse ortam değişkeniyle
 * de verilebilir.
 */
function readLocalConfig() {
  const fromEnv = {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  }
  if (fromEnv.url && fromEnv.anonKey && fromEnv.serviceKey) return fromEnv

  let output
  try {
    output = execFileSync('npx', ['--yes', 'supabase@latest', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch {
    console.error('Yerel Supabase çalışmıyor. Önce başlatın:\n  npx supabase start')
    process.exit(1)
  }

  const values = new Map(
    output
      .split('\n')
      .map((line) => line.match(/^([A-Z_]+)="?([^"]*)"?$/))
      .filter((match) => match !== null)
      .map((match) => [match[1], match[2]]),
  )

  const config = {
    url: values.get('API_URL'),
    // Yeni CLI sürümleri PUBLISHABLE_KEY/SECRET_KEY, eskiler ANON_KEY/SERVICE_ROLE_KEY veriyor.
    anonKey: values.get('PUBLISHABLE_KEY') || values.get('ANON_KEY'),
    serviceKey: values.get('SECRET_KEY') || values.get('SERVICE_ROLE_KEY'),
  }

  if (!config.url || !config.anonKey || !config.serviceKey) {
    console.error('supabase status çıktısından anahtarlar okunamadı.')
    process.exit(1)
  }
  return config
}

const { url: URL, anonKey: ANON, serviceKey: SERVICE } = readLocalConfig()

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
let pass = 0
const fail = []
function check(label, condition, extra = '') {
  if (condition) {
    pass++
    console.log(`  ✓ ${label}`)
  } else {
    fail.push(label)
    console.log(`  ✗ ${label} ${extra}`)
  }
}

const PASSWORD = 'test-parola-123'

/** Kullanıcıyı sıfırdan oluşturur; varsa önce siler (betik tekrar çalışabilsin). */
async function makeUser(email) {
  const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 })
  const existing = list?.users?.find((user) => user.email === email)
  if (existing) {
    const { error } = await admin.auth.admin.deleteUser(existing.id, false)
    if (error) throw new Error(`Eski kullanıcı silinemedi: ${error.message}`)
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  })
  if (error) throw error

  const client = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  })
  if (signInError) throw signInError
  return { id: data.user.id, client }
}

console.log('── Kurulum ──')
const ayse = await makeUser('ayse@test.local')
const burak = await makeUser('burak@test.local')
check('iki kullanıcı oluşturuldu ve giriş yapıldı', Boolean(ayse.id && burak.id))

// handle_new_user tetikleyicisi profil açmış olmalı
const { data: profile } = await ayse.client.from('profiles').select('*').eq('id', ayse.id).single()
check('kayıt tetikleyicisi profil oluşturdu', profile?.id === ayse.id)

console.log('── Çocuk profili ──')
const { data: child, error: childError } = await ayse.client
  .from('children')
  .insert({ owner_id: ayse.id, name: 'Elif', birth_date: '2019-05-01', gender: 'girl' })
  .select()
  .single()
check('çocuk profili oluşturuldu', Boolean(child), childError?.message ?? '')

const { data: interest } = await ayse.client
  .from('interests')
  .select('id')
  .eq('slug', 'uzay')
  .single()
const { error: interestError } = await ayse.client
  .from('child_interests')
  .insert({ child_id: child.id, interest_id: interest.id })
check('ilgi alanı bağlandı', !interestError, interestError?.message ?? '')

console.log('── RLS yalıtımı ──')
const { data: burakSees } = await burak.client.from('children').select('*')
check("Burak Ayşe'nin çocuğunu göremez", (burakSees ?? []).length === 0)

const { error: crossWrite } = await burak.client
  .from('library_items')
  .insert({ child_id: child.id, book_id: null })
check('Burak başkasının çocuğuna yazamaz', Boolean(crossWrite))

const { error: catalogWrite } = await ayse.client
  .from('books')
  .insert({ slug: 'korsan-kitap', title: 'Korsan', language: 'tr' })
check('normal üye katalog yazamaz', Boolean(catalogWrite))

console.log('── Kütüphane ve okuma oturumları ──')
const { data: book } = await ayse.client
  .from('catalog_books')
  .select('id, slug, title')
  .eq('slug', 'caya-gelen-kaplan')
  .single()
check('katalog kitabı okunabildi', Boolean(book))

const { data: item, error: itemError } = await ayse.client
  .from('library_items')
  .upsert(
    { child_id: child.id, book_id: book.id, status: 'to_read', added_from: 'catalog' },
    { onConflict: 'child_id,book_id' },
  )
  .select()
  .single()
check('kütüphane kaydı upsert edildi', Boolean(item), itemError?.message ?? '')

// Aynı upsert tekrar — çakışma hatası vermemeli
const { error: upsertAgain } = await ayse.client
  .from('library_items')
  .upsert(
    { child_id: child.id, book_id: book.id, is_favorite: true },
    { onConflict: 'child_id,book_id' },
  )
check('upsert tekrarlanabilir (onConflict çalışıyor)', !upsertAgain, upsertAgain?.message ?? '')

const today = new Date().toISOString().slice(0, 10)
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
await ayse.client.from('reading_sessions').insert([
  { library_item_id: item.id, read_on: yesterday },
  { library_item_id: item.id, read_on: today },
])

const { data: after } = await ayse.client
  .from('library_items')
  .select('*')
  .eq('id', item.id)
  .single()
check('times_read tetikleyiciyle güncellendi', after?.times_read === 2, `(${after?.times_read})`)
check('durum otomatik "read" oldu', after?.status === 'read', `(${after?.status})`)
check('son okuma tarihi doğru', after?.last_read_at === today)

console.log('── Notlar ──')
const { data: note, error: noteError } = await ayse.client
  .from('reading_notes')
  .insert({ library_item_id: item.id, body: 'Elif çok sevdi.', visibility: 'private' })
  .select()
  .single()
check('not eklendi', Boolean(note), noteError?.message ?? '')
const { data: burakNotes } = await burak.client.from('reading_notes').select('*')
check('Burak notları göremez', (burakNotes ?? []).length === 0)

console.log('── Başarımlar ──')
await ayse.client.from('library_items').update({ rating: 5 }).eq('id', item.id)
const { data: granted, error: rpcError } = await ayse.client.rpc('evaluate_child_achievements', {
  target_child_id: child.id,
})
check('başarım değerlendirmesi çalıştı', !rpcError, rpcError?.message ?? '')
check('en az bir başarım verildi', (granted ?? 0) >= 1, `(${granted})`)

const { data: points } = await ayse.client.rpc('child_points', { target_child_id: child.id })
check('puan hesaplandı', (points ?? 0) >= 1, `(${points})`)

const { data: earned } = await ayse.client
  .from('child_achievements')
  .select('achievement_id')
  .eq('child_id', child.id)
check('kazanılan başarımlar okunabiliyor', (earned ?? []).length >= 1)

console.log('── Arama ──')
const { data: search, error: searchError } = await ayse.client
  .from('books')
  .select('title')
  .textSearch('search_vector', 'kardes:*', { config: 'search_tr' })
check(
  'Türkçe önek araması çalıştı',
  !searchError && (search ?? []).length > 0,
  searchError?.message ?? `(${search?.length} sonuç)`,
)

console.log('── Kendi kitabın ──')
const { data: custom, error: customError } = await ayse.client
  .from('custom_books')
  .insert({ owner_id: ayse.id, title: 'Kapaktan Eklenen', origin: 'camera' })
  .select()
  .single()
check('kişisel kitap eklendi', Boolean(custom), customError?.message ?? '')

const { error: customItemError } = await ayse.client
  .from('library_items')
  .upsert(
    { child_id: child.id, custom_book_id: custom.id, status: 'to_read', added_from: 'camera' },
    { onConflict: 'child_id,custom_book_id' },
  )
check('kişisel kitap kütüphaneye bağlandı', !customItemError, customItemError?.message ?? '')

console.log('── Editör yetkisi ──')
await admin.from('user_roles').insert({ user_id: burak.id, role: 'editor' })
const editor = createClient(URL, ANON, { auth: { persistSession: false } })
await editor.auth.signInWithPassword({ email: 'burak@test.local', password: PASSWORD })
const { error: editorWrite } = await editor
  .from('books')
  .update({ summary: 'Editör güncelledi.' })
  .eq('id', book.id)
check('editör katalog yazabilir', !editorWrite, editorWrite?.message ?? '')

console.log('── Anonim erişim ──')
const anon = createClient(URL, ANON, { auth: { persistSession: false } })
const { data: anonBooks } = await anon.from('catalog_books').select('id').limit(500)
check('anonim kataloğu görebilir', (anonBooks ?? []).length === 196, `(${anonBooks?.length})`)
const { data: anonChildren, error: anonChildError } = await anon.from('children').select('*')
check(
  'anonim çocuk profillerine erişemez',
  Boolean(anonChildError) || (anonChildren ?? []).length === 0,
)

console.log(`\n${pass} geçti, ${fail.length} başarısız`)
if (fail.length > 0) {
  console.log('Başarısız:', fail.join(' · '))
  process.exit(1)
}
