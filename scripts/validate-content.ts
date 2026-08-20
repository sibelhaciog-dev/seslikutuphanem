/**
 * İçerik dosyalarını doğrular: `npm run content:validate`
 *
 * Şema hataları ve tutarsızlıklar çıkışı 1 yapar; uyarılar yalnızca raporlanır.
 */
import { z } from 'zod'
import { checkContentConsistency } from '../src/lib/content/schema'
import { loadAllContent } from '../src/lib/content/load'

function reportZodError(fileName: string, error: z.ZodError): never {
  console.error(`\n❌ ${fileName} şemaya uymuyor:\n`)
  for (const issue of error.issues) {
    console.error(`  • ${issue.path.join('.') || '(kök)'}: ${issue.message}`)
  }
  process.exit(1)
}

let content
try {
  content = loadAllContent()
} catch (error) {
  if (error instanceof z.ZodError) reportZodError('content/', error)
  throw error
}

const { taxonomy, books, achievements, organizations } = content
const issues = checkContentConsistency(books, taxonomy)
const errors = issues.filter((issue) => issue.level === 'error')
const warnings = issues.filter((issue) => issue.level === 'warning')

if (warnings.length > 0) {
  const byMessage = new Map<string, number>()
  for (const warning of warnings) {
    const key = warning.message.replace(/:.*$/, '')
    byMessage.set(key, (byMessage.get(key) ?? 0) + 1)
  }
  console.warn(`⚠️  ${warnings.length} uyarı:`)
  for (const [message, count] of byMessage) {
    console.warn(`  • ${message} — ${count} kitap`)
  }
  console.warn('')
}

if (errors.length > 0) {
  console.error(`❌ ${errors.length} hata:\n`)
  for (const error of errors) console.error(`  • ${error.message}`)
  process.exit(1)
}

const topicCount = taxonomy.developmentAreas.reduce((total, area) => total + area.topics.length, 0)

console.log('✅ İçerik doğrulandı')
console.log(`   Kitap:            ${books.length}`)
console.log(`   Gelişim alanı:    ${taxonomy.developmentAreas.length} (${topicCount} konu)`)
console.log(`   İlgi alanı:       ${taxonomy.interests.length}`)
console.log(`   Başarım:          ${achievements.length}`)
console.log(`   Bağış kurumu:     ${organizations.length}`)
console.log(
  `   Türkçe / İngilizce: ${books.filter((b) => b.language === 'tr').length} / ${books.filter((b) => b.language === 'en').length}`,
)
