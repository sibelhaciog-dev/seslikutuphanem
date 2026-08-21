/**
 * `.env.local` ve `.env` dosyalarını process.env'e yükler.
 *
 * ÖNCELİK (Next.js ile aynı): zaten tanımlı olan değişken > `.env.local` > `.env`
 *
 * Var olan değişkenlerin ÜZERİNE YAZILMAZ. Bu kritik: `db:sync:local` gibi
 * komutlar `DATABASE_URL`'i satır içinde veriyor. Üzerine yazsaydık
 * `.env.local` üretime işaret ettiği için yerel test üretim veritabanını
 * değiştirirdi.
 *
 * Harici bağımlılık kullanmıyoruz; ihtiyacımız olan biçim bu kadar basit.
 */
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** `KEY=value` satırlarını ayrıştırır. Tırnak, `export` öneki ve yorum destekli. */
function parse(contents: string): Record<string, string> {
  const result: Record<string, string> = {}

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line
    const separator = withoutExport.indexOf('=')
    if (separator <= 0) continue

    const key = withoutExport.slice(0, separator).trim()
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue

    let value = withoutExport.slice(separator + 1).trim()

    const quote = value[0]
    if ((quote === '"' || quote === "'") && value.endsWith(quote) && value.length > 1) {
      value = value.slice(1, -1)
      // Yalnızca çift tırnakta kaçış dizileri çözülür (dotenv davranışı).
      if (quote === '"') value = value.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
    } else {
      // Tırnaksız değerde satır sonu yorumu kırpılır.
      const comment = value.indexOf(' #')
      if (comment !== -1) value = value.slice(0, comment).trim()
    }

    result[key] = value
  }

  return result
}

/**
 * Ortam dosyalarını yükler ve hangilerinin okunduğunu döndürür.
 * Proje kökünden okur, çalışma dizininden değil.
 */
export function loadEnvFiles(): string[] {
  const root = resolve(import.meta.dirname, '..', '..')
  const loaded: string[] = []

  // Sırayla okunur; önce okunan kazanır (.env.local > .env).
  for (const name of ['.env.local', '.env']) {
    const path = resolve(root, name)
    if (!existsSync(path)) continue

    for (const [key, value] of Object.entries(parse(readFileSync(path, 'utf8')))) {
      if (process.env[key] === undefined) process.env[key] = value
    }
    loaded.push(name)
  }

  return loaded
}
