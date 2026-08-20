import type { Metadata, Viewport } from 'next'
import { DM_Sans, DM_Serif_Display } from 'next/font/google'
import { AppDataProvider } from '@/components/providers/AppDataProvider'
import { aiEnabled } from '@/lib/ai/config'
import { SiteHeader } from '@/components/layout/SiteHeader'
import { ToastProvider } from '@/components/ui/Toast'
import { getTaxonomy } from '@/lib/data/catalog'
import { siteUrl } from '@/lib/env'
import { getViewer } from '@/lib/supabase/server'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const dmSerif = DM_Serif_Display({
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  variable: '--font-dm-serif',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: 'Sesli Kütüphanem — Çocuğunuz için kitap keşfedin',
    template: '%s · Sesli Kütüphanem',
  },
  description:
    'Çocuğunuzun yaşına, ilgi alanlarına ve gelişim ihtiyacına göre seçilmiş çocuk kitapları rehberi. Okuduklarınızı takip edin, puanlayın ve yeni kitaplar keşfedin.',
  keywords: ['çocuk kitapları', 'kitap önerisi', 'okuma takibi', 'çocuk gelişimi', 'resimli kitap'],
  openGraph: {
    type: 'website',
    locale: 'tr_TR',
    siteName: 'Sesli Kütüphanem',
    title: 'Sesli Kütüphanem — Çocuğunuz için kitap keşfedin',
    description:
      'Yaşa ve gelişim alanına göre seçilmiş çocuk kitapları. Okuma takibi, puanlama ve kişisel öneriler.',
  },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  themeColor: '#E8602C',
  width: 'device-width',
  initialScale: 1,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [{ user, isStaff }, taxonomy] = await Promise.all([getViewer(), getTaxonomy()])

  return (
    <html lang="tr" className={`${dmSans.variable} ${dmSerif.variable}`}>
      <body className="min-h-dvh">
        <a
          href="#icerik"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:text-white"
        >
          İçeriğe geç
        </a>
        <ToastProvider>
          <AppDataProvider
            userId={user?.id ?? null}
            userEmail={user?.email ?? null}
            isStaff={isStaff}
            taxonomy={taxonomy}
            /* Sunucuda okunur; istemci anahtarı görmeden özelliğin açık olup
               olmadığını bilir ve çalışmayacak butonu göstermez. */
            aiEnabled={aiEnabled()}
          >
            <SiteHeader />
            <main id="icerik">{children}</main>
          </AppDataProvider>
        </ToastProvider>
      </body>
    </html>
  )
}
