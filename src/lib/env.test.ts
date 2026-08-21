import { afterEach, describe, expect, it } from 'vitest'
import { siteUrl } from './env'

const ORIGINAL = {
  site: process.env.NEXT_PUBLIC_SITE_URL,
  vercel: process.env.VERCEL_URL,
}

function setEnv(site?: string, vercel?: string) {
  if (site === undefined) delete process.env.NEXT_PUBLIC_SITE_URL
  else process.env.NEXT_PUBLIC_SITE_URL = site
  if (vercel === undefined) delete process.env.VERCEL_URL
  else process.env.VERCEL_URL = vercel
}

afterEach(() => setEnv(ORIGINAL.site, ORIGINAL.vercel))

describe('siteUrl', () => {
  it('tam adresi olduğu gibi kullanır', () => {
    setEnv('https://seslikutuphanem.com')
    expect(siteUrl()).toBe('https://seslikutuphanem.com')
  })

  it('sondaki eğik çizgiyi atar', () => {
    setEnv('https://seslikutuphanem.com///')
    expect(siteUrl()).toBe('https://seslikutuphanem.com')
  })

  // Vercel panelinde sıkça şemasız yazılıyor; derlemeyi düşürmemeli.
  it('şema eksikse https ekler', () => {
    setEnv('sesli-kutuphanem.vercel.app')
    expect(siteUrl()).toBe('https://sesli-kutuphanem.vercel.app')
  })

  it('yerel adrese http ekler', () => {
    setEnv('localhost:3000')
    expect(siteUrl()).toBe('http://localhost:3000')
  })

  it('VERCEL_URL şemasız gelir, tamamlanır', () => {
    setEnv(undefined, 'sesli-kutuphanem-abc123.vercel.app')
    expect(siteUrl()).toBe('https://sesli-kutuphanem-abc123.vercel.app')
  })

  it('NEXT_PUBLIC_SITE_URL, VERCEL_URL önüne geçer', () => {
    setEnv('https://seslikutuphanem.com', 'baska.vercel.app')
    expect(siteUrl()).toBe('https://seslikutuphanem.com')
  })

  it('boş veya bozuk değerde yedeğe düşer', () => {
    setEnv('   ')
    expect(siteUrl()).toBe('http://localhost:3000')
    setEnv('http://')
    expect(siteUrl()).toBe('http://localhost:3000')
  })

  it('hiçbiri yoksa yerel adres', () => {
    setEnv(undefined, undefined)
    expect(siteUrl()).toBe('http://localhost:3000')
  })

  // Adresin sonucu her zaman new URL() ile ayrıştırılabilmeli:
  // layout.tsx içindeki metadataBase bunu yapıyor.
  it('sonuç her durumda geçerli bir URL', () => {
    for (const value of ['ornek.com', 'https://ornek.com/yol/', 'localhost:3000', '  ']) {
      setEnv(value)
      expect(() => new URL(siteUrl())).not.toThrow()
    }
  })
})
