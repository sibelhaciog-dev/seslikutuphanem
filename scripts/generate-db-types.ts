/**
 * Veritabanı tiplerini şemadan üretir: `npm run db:types`
 *
 * Supabase CLI'ye erişim olmadığı için introspection'ı kendimiz yapıyoruz.
 * Kaynak, `DATABASE_URL` ile gösterilen veritabanıdır — yerel Docker da olur,
 * Supabase de. Böylece tipler şemadan asla sapmaz. Değişken `.env.local` veya
 * `.env` dosyasından okunur; satır içinde verilirse o öne geçer.
 */
import { writeFileSync } from 'node:fs'
import { Client } from 'pg'
import { loadEnvFiles } from './lib/env'

loadEnvFiles()

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  console.error('DATABASE_URL tanımlı değil.')
  console.error('`.env.local` dosyasına ekleyin ya da komutun başında verin.')
  process.exit(1)
}

const OUTPUT = 'src/lib/supabase/database.types.ts'

/** Postgres tipi → TypeScript tipi. */
function mapType(udtName: string, enums: Map<string, string[]>): string {
  if (udtName.startsWith('_')) {
    return `${mapType(udtName.slice(1), enums)}[]`
  }
  const enumValues = enums.get(udtName)
  if (enumValues) return enumValues.map((value) => `'${value}'`).join(' | ')

  switch (udtName) {
    case 'bool':
      return 'boolean'
    case 'int2':
    case 'int4':
    case 'int8':
    case 'float4':
    case 'float8':
    case 'numeric':
      return 'number'
    case 'json':
    case 'jsonb':
      return 'Json'
    case 'uuid':
    case 'text':
    case 'citext':
    case 'varchar':
    case 'bpchar':
    case 'date':
    case 'timestamp':
    case 'timestamptz':
    case 'time':
    case 'timetz':
    case 'interval':
      return 'string'
    case 'tsvector':
      return 'unknown'
    default:
      return 'unknown'
  }
}

interface ColumnRow {
  table_name: string
  column_name: string
  is_nullable: 'YES' | 'NO'
  udt_name: string
  has_default: boolean
  is_generated: boolean
  table_kind: 'table' | 'view'
}

async function main() {
  const client = new Client({
    connectionString,
    ssl: connectionString!.includes('supabase.') ? { rejectUnauthorized: false } : undefined,
  })
  await client.connect()

  // ─── Enum'lar ────────────────────────────────────────────────────────────
  const { rows: enumRows } = await client.query<{ name: string; labels: string[] }>(`
    select t.typname as name, array_agg(e.enumlabel::text order by e.enumsortorder) as labels
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public'
    group by t.typname
    order by t.typname
  `)
  const enums = new Map(enumRows.map((row) => [row.name, row.labels]))

  // ─── Sütunlar ────────────────────────────────────────────────────────────
  const { rows: columns } = await client.query<ColumnRow>(`
    select c.relname as table_name,
           a.attname as column_name,
           case when a.attnotnull then 'NO' else 'YES' end as is_nullable,
           t.typname as udt_name,
           (d.adbin is not null) as has_default,
           (a.attidentity <> '' or a.attgenerated <> '') as is_generated,
           case c.relkind when 'r' then 'table' else 'view' end as table_kind
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_type t on t.oid = a.atttypid
    left join pg_attrdef d on d.adrelid = c.oid and d.adnum = a.attnum
    where n.nspname = 'public'
      and c.relkind in ('r', 'v')
      and a.attnum > 0
      and not a.attisdropped
    order by c.relname, a.attnum
  `)

  // ─── Fonksiyonlar ────────────────────────────────────────────────────────
  const { rows: functions } = await client.query<{
    name: string
    args: string
    returns: string
  }>(`
    select p.proname as name,
           pg_get_function_arguments(p.oid) as args,
           t.typname as returns
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    join pg_type t on t.oid = p.prorettype
    -- Uzantıların (unaccent, pg_trgm, citext) getirdiği fonksiyonlar hariç.
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    where n.nspname = 'public'
      and p.prokind = 'f'
      and t.typname <> 'trigger'
      and d.objid is null
    order by p.proname
  `)

  // ─── Yabancı anahtarlar (iç içe select'lerin tip çıkarımı için) ──────────
  const { rows: foreignKeys } = await client.query<{
    table_name: string
    constraint_name: string
    columns: string[]
    referenced_table: string
    referenced_columns: string[]
    is_one_to_one: boolean
  }>(`
    select
      src.relname as table_name,
      con.conname as constraint_name,
      array_agg(src_col.attname order by k.ord)::text[] as columns,
      tgt.relname as referenced_table,
      array_agg(tgt_col.attname order by k.ord)::text[] as referenced_columns,
      exists (
        select 1 from pg_index i
        where i.indrelid = con.conrelid
          and i.indisunique
          and i.indnatts = array_length(con.conkey, 1)
          and con.conkey::int[] @> i.indkey::int[]
      ) as is_one_to_one
    from pg_constraint con
    join pg_class src on src.oid = con.conrelid
    join pg_class tgt on tgt.oid = con.confrelid
    join pg_namespace n on n.oid = src.relnamespace
    cross join lateral unnest(con.conkey, con.confkey) with ordinality as k(src_att, tgt_att, ord)
    join pg_attribute src_col on src_col.attrelid = con.conrelid and src_col.attnum = k.src_att
    join pg_attribute tgt_col on tgt_col.attrelid = con.confrelid and tgt_col.attnum = k.tgt_att
    where con.contype = 'f' and n.nspname = 'public'
    group by src.relname, con.conname, tgt.relname, con.conrelid, con.conkey
    order by src.relname, con.conname
  `)

  const fksByTable = new Map<string, typeof foreignKeys>()
  for (const fk of foreignKeys) {
    const list = fksByTable.get(fk.table_name) ?? []
    list.push(fk)
    fksByTable.set(fk.table_name, list)
  }

  // ─── Çıktı ───────────────────────────────────────────────────────────────
  const byTable = new Map<string, ColumnRow[]>()
  for (const column of columns) {
    const list = byTable.get(column.table_name) ?? []
    list.push(column)
    byTable.set(column.table_name, list)
  }

  const tableNames = [...byTable.keys()].filter(
    (name) => byTable.get(name)![0]!.table_kind === 'table',
  )
  const viewNames = [...byTable.keys()].filter(
    (name) => byTable.get(name)![0]!.table_kind === 'view',
  )

  const lines: string[] = [
    '/**',
    ' * OTOMATİK ÜRETİLDİ — elle düzenlemeyin.',
    ' *',
    ' * Şemayı değiştirdikten sonra yeniden üretin:',
    ' *   npm run db:local          (yerel şemayı kur)',
    ' *   npm run db:types          (tipleri üret)',
    ' */',
    '',
    'export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]',
    '',
    'export interface Database {',
    '  public: {',
    '    Tables: {',
  ]

  for (const table of tableNames) {
    const cols = byTable.get(table)!
    lines.push(`      ${table}: {`)
    lines.push('        Row: {')
    for (const col of cols) {
      const type = mapType(col.udt_name, enums)
      lines.push(
        `          ${col.column_name}: ${type}${col.is_nullable === 'YES' ? ' | null' : ''}`,
      )
    }
    lines.push('        }')

    lines.push('        Insert: {')
    for (const col of cols) {
      if (col.is_generated) continue
      const type = mapType(col.udt_name, enums)
      const optional = col.has_default || col.is_nullable === 'YES'
      lines.push(
        `          ${col.column_name}${optional ? '?' : ''}: ${type}${col.is_nullable === 'YES' ? ' | null' : ''}`,
      )
    }
    lines.push('        }')

    lines.push('        Update: {')
    for (const col of cols) {
      if (col.is_generated) continue
      const type = mapType(col.udt_name, enums)
      lines.push(
        `          ${col.column_name}?: ${type}${col.is_nullable === 'YES' ? ' | null' : ''}`,
      )
    }
    lines.push('        }')
    lines.push(renderRelationships(fksByTable.get(table) ?? []))
    lines.push('      }')
  }

  lines.push('    }')
  lines.push('    Views: {')
  for (const view of viewNames) {
    const cols = byTable.get(view)!
    lines.push(`      ${view}: {`)
    lines.push('        Row: {')
    for (const col of cols) {
      const type = mapType(col.udt_name, enums)
      lines.push(`          ${col.column_name}: ${type} | null`)
    }
    lines.push('        }')
    lines.push('        Relationships: []')
    lines.push('      }')
  }
  lines.push('    }')

  lines.push('    Functions: {')
  for (const fn of functions) {
    const args = fn.args
      .split(',')
      .map((arg) => arg.trim())
      .filter(Boolean)
      .map((arg) => {
        const [name, ...typeParts] = arg.split(/\s+/)
        return { name, type: mapType(normalizeArgType(typeParts.join(' ')), enums) }
      })
    lines.push(`      ${fn.name}: {`)
    if (args.length === 0) {
      lines.push('        Args: Record<string, never>')
    } else {
      lines.push('        Args: {')
      for (const arg of args) lines.push(`          ${arg.name}: ${arg.type}`)
      lines.push('        }')
    }
    lines.push(`        Returns: ${mapType(fn.returns, enums)}`)
    lines.push('      }')
  }
  lines.push('    }')

  lines.push('    Enums: {')
  for (const [name, labels] of enums) {
    lines.push(`      ${name}: ${labels.map((label) => `'${label}'`).join(' | ')}`)
  }
  lines.push('    }')
  lines.push('    CompositeTypes: Record<string, never>')
  lines.push('  }')
  lines.push('}')
  lines.push('')

  writeFileSync(OUTPUT, lines.join('\n'))
  await client.end()

  console.log(`✅ ${OUTPUT} üretildi`)
  console.log(`   tablo: ${tableNames.length} · görünüm: ${viewNames.length}`)
  console.log(`   fonksiyon: ${functions.length} · enum: ${enums.size}`)
}

interface ForeignKey {
  constraint_name: string
  columns: string[]
  referenced_table: string
  referenced_columns: string[]
  is_one_to_one: boolean
}

/** supabase-js'in iç içe select tip çıkarımı için ilişki listesi. */
function renderRelationships(keys: ForeignKey[]): string {
  if (keys.length === 0) return '        Relationships: []'
  const entries = keys.map(
    (key) =>
      `          {\n` +
      `            foreignKeyName: '${key.constraint_name}'\n` +
      `            columns: [${key.columns.map((column) => `'${column}'`).join(', ')}]\n` +
      `            isOneToOne: ${key.is_one_to_one}\n` +
      `            referencedRelation: '${key.referenced_table}'\n` +
      `            referencedColumns: [${key.referenced_columns.map((column) => `'${column}'`).join(', ')}]\n` +
      `          }`,
  )
  return `        Relationships: [\n${entries.join(',\n')},\n        ]`
}

/** `character varying`, `integer` gibi SQL tip adlarını udt adına çevirir. */
function normalizeArgType(sqlType: string): string {
  const map: Record<string, string> = {
    integer: 'int4',
    smallint: 'int2',
    bigint: 'int8',
    boolean: 'bool',
    'character varying': 'varchar',
    text: 'text',
    uuid: 'uuid',
    jsonb: 'jsonb',
    'timestamp with time zone': 'timestamptz',
    date: 'date',
    numeric: 'numeric',
    tsquery: 'tsquery',
  }
  return map[sqlType.toLowerCase()] ?? sqlType.toLowerCase()
}

main().catch((error) => {
  console.error('❌ Tip üretimi başarısız:', error)
  process.exit(1)
})
