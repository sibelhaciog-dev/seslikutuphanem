import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  achievementsSchema,
  booksSchema,
  discoveryModesSchema,
  organizationsSchema,
  taxonomySchema,
  type Achievement,
  type BookContent,
  type DiscoveryMode,
  type Organization,
  type Taxonomy,
} from './schema'

/**
 * `content/` dosyalarını okur ve doğrular.
 *
 * Yalnızca Node tarafında (betikler ve derleme zamanı) kullanılır; tarayıcı
 * paketine girmez.
 */

const CONTENT_DIR = resolve(process.cwd(), 'content')

function readJson(fileName: string): unknown {
  return JSON.parse(readFileSync(resolve(CONTENT_DIR, fileName), 'utf8'))
}

export function loadTaxonomy(): Taxonomy {
  return taxonomySchema.parse(readJson('taxonomy.json'))
}

export function loadBooks(): BookContent[] {
  return booksSchema.parse(readJson('books.json'))
}

export function loadAchievements(): Achievement[] {
  return achievementsSchema.parse(readJson('achievements.json'))
}

export function loadOrganizations(): Organization[] {
  return organizationsSchema.parse(readJson('organizations.json'))
}

export function loadDiscoveryModes(): DiscoveryMode[] {
  return discoveryModesSchema.parse(readJson('discovery-modes.json'))
}

export function loadAllContent() {
  return {
    taxonomy: loadTaxonomy(),
    books: loadBooks(),
    achievements: loadAchievements(),
    organizations: loadOrganizations(),
    discoveryModes: loadDiscoveryModes(),
  }
}
