import { z } from 'zod'

/**
 * `content/` altındaki dosyaların şemaları.
 *
 * Bu dosyalar kataloğun yazım kaynağıdır (ADR 0002); `npm run db:sync` ile
 * Supabase'e aktarılır. Buradaki her kural, veritabanındaki kısıtın aynısıdır.
 */

const slug = z
  .string()
  .min(1)
  .max(120)
  .regex(/^[a-z0-9-]+$/, 'Slug yalnızca küçük harf, rakam ve tire içerebilir')

const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Renk #RRGGBB biçiminde olmalı')

// ─── Taksonomi ───────────────────────────────────────────────────────────────

export const developmentTopicSchema = z.object({
  slug,
  name: z.string().min(1).max(80),
  /** Menüde farklı görünecekse. */
  label: z.string().min(1).max(80).nullable().default(null),
  description: z.string().max(500).nullable().default(null),
  /** Etiketlenmemiş kitapları yakalamak için desenler (senkronda kullanılır). */
  keywords: z.array(z.string().min(2)).default([]),
  position: z.number().int().nonnegative(),
})

export const developmentAreaSchema = z.object({
  slug,
  name: z.string().min(1).max(80),
  description: z.string().max(500).nullable().default(null),
  emoji: z.string().min(1).max(8),
  color: hexColor,
  position: z.number().int().nonnegative(),
  topics: z.array(developmentTopicSchema).min(1),
})

export const interestSchema = z.object({
  slug,
  name: z.string().min(1).max(60),
  emoji: z.string().min(1).max(8),
  keywords: z.array(z.string().min(2)).default([]),
  position: z.number().int().nonnegative(),
})

export const taxonomySchema = z.object({
  developmentAreas: z.array(developmentAreaSchema).min(1),
  interests: z.array(interestSchema).min(1),
})

// ─── Keşif modları ─────────────────────────────────────────────────────────
// Aday havuzunu belirli konulara/ilgi alanlarına eğen ayarlar (ADR 0007).
// Ağırlık `book_topics.relevance` ile aynı ölçekte: 1 zayıf, 5 güçlü.

const modeWeightSchema = z.object({
  slug,
  weight: z.number().int().min(1).max(5).default(3),
})

export const discoveryModeSchema = z.object({
  slug,
  name: z.string().min(1).max(60),
  emoji: z.string().min(1).max(8).nullable().default(null),
  description: z.string().max(200).nullable().default(null),
  /** Yapay zekâ istemine eklenen cümle; modun niyetini modele anlatır. */
  promptHint: z.string().max(400).nullable().default(null),
  language: z.enum(['tr', 'en']).nullable().default(null),
  position: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
  topics: z.array(modeWeightSchema).default([]),
  interests: z.array(modeWeightSchema).default([]),
})

export const discoveryModesSchema = z.array(discoveryModeSchema)
export type DiscoveryMode = z.infer<typeof discoveryModeSchema>

export type Taxonomy = z.infer<typeof taxonomySchema>
export type DevelopmentArea = z.infer<typeof developmentAreaSchema>
export type DevelopmentTopic = z.infer<typeof developmentTopicSchema>
export type Interest = z.infer<typeof interestSchema>

// ─── Başarımlar ──────────────────────────────────────────────────────────────

export const achievementCriteriaSchema = z.object({
  type: z.enum([
    'books_read',
    'sessions',
    'streak_days',
    'ratings',
    'favorites',
    'notes',
    'distinct_areas',
  ]),
  threshold: z.number().int().positive(),
})

export const achievementSchema = z.object({
  slug,
  name: z.string().min(1).max(60),
  description: z.string().min(1).max(200),
  emoji: z.string().min(1).max(8),
  criteria: achievementCriteriaSchema,
  points: z.number().int().min(0).max(100),
  position: z.number().int().nonnegative(),
})

export const achievementsSchema = z.array(achievementSchema).min(1)
export type Achievement = z.infer<typeof achievementSchema>

// ─── Bağış kurumları ─────────────────────────────────────────────────────────

export const organizationSchema = z.object({
  slug,
  name: z.string().min(1).max(120),
  description: z.string().max(500).nullable().default(null),
  website: z.url().nullable().default(null),
  isActive: z.boolean().default(true),
  position: z.number().int().nonnegative(),
})

export const organizationsSchema = z.array(organizationSchema)
export type Organization = z.infer<typeof organizationSchema>

// ─── Kitaplar ────────────────────────────────────────────────────────────────

export const bookTopicRefSchema = z.object({
  slug,
  /** 1: zayıf ilişki, 5: kitabın ana konusu. */
  relevance: z.number().int().min(1).max(5).default(3),
})

export const instagramSchema = z.object({
  url: z.url(),
  shortcode: z.string().min(1).max(40),
  postedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG biçiminde olmalı')
    .nullable()
    .default(null),
  likeCount: z.number().int().nonnegative().default(0),
})

export const seriesRefSchema = z.object({
  slug,
  title: z.string().min(1).max(160),
  position: z.number().int().positive().nullable().default(null),
})

export const bookSchema = z.object({
  slug,
  title: z.string().min(1).max(200),
  subtitle: z.string().max(200).nullable().default(null),
  originalTitle: z.string().max(200).nullable().default(null),
  summary: z.string().max(1000).default(''),
  description: z.string().max(5000).nullable().default(null),

  language: z.enum(['tr', 'en']).default('tr'),

  ageMin: z.number().int().min(0).max(18).nullable().default(null),
  ageMax: z.number().int().min(0).max(18).nullable().default(null),

  pageCount: z.number().int().positive().max(2000).nullable().default(null),
  isbn13: z
    .string()
    .regex(/^\d{13}$/, 'ISBN 13 haneli olmalı')
    .nullable()
    .default(null),
  publishedYear: z.number().int().min(1800).max(2100).nullable().default(null),

  publisher: z.string().min(1).max(120).nullable().default(null),
  series: seriesRefSchema.nullable().default(null),

  authors: z.array(z.string().min(1).max(120)).default([]),
  illustrators: z.array(z.string().min(1).max(120)).default([]),
  translators: z.array(z.string().min(1).max(120)).default([]),

  instagram: instagramSchema.nullable().default(null),
  coverPath: z.string().max(300).nullable().default(null),

  status: z.enum(['draft', 'published', 'archived']).default('published'),
  topics: z.array(bookTopicRefSchema).default([]),
  interests: z.array(slug).default([]),
})

export const booksSchema = z.array(bookSchema)
export type BookContent = z.infer<typeof bookSchema>

// ─── Çapraz doğrulama ────────────────────────────────────────────────────────

export interface ContentIssue {
  level: 'error' | 'warning'
  message: string
}

/**
 * Şema tek başına yakalayamayan tutarlılık kurallarını denetler:
 * yinelenen slug, taksonomide olmayan konu, tutarsız yaş aralığı…
 */
export function checkContentConsistency(
  books: BookContent[],
  taxonomy: Taxonomy,
  discoveryModes: DiscoveryMode[] = [],
): ContentIssue[] {
  const issues: ContentIssue[] = []

  const topicSlugs = new Set(
    taxonomy.developmentAreas.flatMap((area) => area.topics.map((topic) => topic.slug)),
  )
  const interestSlugs = new Set(taxonomy.interests.map((interest) => interest.slug))

  const seenModeSlugs = new Set<string>()
  for (const mode of discoveryModes) {
    if (seenModeSlugs.has(mode.slug)) {
      issues.push({ level: 'error', message: `Yinelenen keşif modu: ${mode.slug}` })
    }
    seenModeSlugs.add(mode.slug)

    for (const topic of mode.topics) {
      if (!topicSlugs.has(topic.slug)) {
        issues.push({
          level: 'error',
          message: `Keşif modu "${mode.slug}" bilinmeyen konuya işaret ediyor: ${topic.slug}`,
        })
      }
    }
    for (const interest of mode.interests) {
      if (!interestSlugs.has(interest.slug)) {
        issues.push({
          level: 'error',
          message: `Keşif modu "${mode.slug}" bilinmeyen ilgi alanına işaret ediyor: ${interest.slug}`,
        })
      }
    }
    if (mode.topics.length === 0 && mode.interests.length === 0) {
      issues.push({
        level: 'warning',
        message: `Keşif modu "${mode.slug}" hiçbir konuya eğilmiyor; aday havuzunu etkilemez.`,
      })
    }
  }

  const seenSlugs = new Set<string>()
  const seenShortcodes = new Set<string>()
  const seenIsbns = new Set<string>()

  for (const book of books) {
    if (seenSlugs.has(book.slug)) {
      issues.push({ level: 'error', message: `Yinelenen slug: ${book.slug}` })
    }
    seenSlugs.add(book.slug)

    if (book.instagram) {
      if (seenShortcodes.has(book.instagram.shortcode)) {
        issues.push({
          level: 'error',
          message: `Yinelenen Instagram kodu: ${book.instagram.shortcode} (${book.slug})`,
        })
      }
      seenShortcodes.add(book.instagram.shortcode)
    }

    if (book.isbn13) {
      if (seenIsbns.has(book.isbn13)) {
        issues.push({ level: 'error', message: `Yinelenen ISBN: ${book.isbn13} (${book.slug})` })
      }
      seenIsbns.add(book.isbn13)
    }

    if (book.ageMin !== null && book.ageMax !== null && book.ageMin > book.ageMax) {
      issues.push({
        level: 'error',
        message: `Yaş aralığı ters: ${book.slug} (${book.ageMin}–${book.ageMax})`,
      })
    }

    for (const topic of book.topics) {
      if (!topicSlugs.has(topic.slug)) {
        issues.push({
          level: 'error',
          message: `Taksonomide olmayan konu "${topic.slug}" — ${book.slug}`,
        })
      }
    }

    for (const interest of book.interests) {
      if (!interestSlugs.has(interest)) {
        issues.push({
          level: 'error',
          message: `Taksonomide olmayan ilgi alanı "${interest}" — ${book.slug}`,
        })
      }
    }

    if (!book.summary.trim()) {
      issues.push({ level: 'warning', message: `Özet boş: ${book.slug}` })
    }
    if (book.ageMin === null) {
      issues.push({ level: 'warning', message: `Yaş aralığı yok: ${book.slug}` })
    }
    if (book.authors.length === 0) {
      issues.push({ level: 'warning', message: `Yazar bilgisi yok: ${book.slug}` })
    }
  }

  const areaSlugs = new Set<string>()
  for (const area of taxonomy.developmentAreas) {
    if (areaSlugs.has(area.slug)) {
      issues.push({ level: 'error', message: `Yinelenen gelişim alanı: ${area.slug}` })
    }
    areaSlugs.add(area.slug)
  }

  return issues
}
