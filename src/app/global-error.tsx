'use client'

import { useEffect } from 'react'

/**
 * Yerleşimin (layout) kendisi çökerse `error.tsx` devreye giremez — o da
 * yerleşimin içinde yaşıyor. Bu dosya olmadan Next.js kendi İngilizce
 * "Application error: a server-side exception has occurred" sayfasını
 * gösteriyordu.
 *
 * Kendi `<html>` ve `<body>` etiketlerini içermek zorunda: bu noktada
 * kök yerleşim çalışmıyor. Aynı sebeple stil dosyalarına da güvenemiyoruz,
 * bu yüzden stiller satır içi.
 */
export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <html lang="tr">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          background: '#fdfaf5',
          color: '#2f2a24',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '28rem' }}>
          <p style={{ fontSize: '3rem', margin: '0 0 1rem' }} aria-hidden>
            🌧️
          </p>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 0.75rem' }}>Bir şeyler ters gitti</h1>
          <p style={{ margin: '0 0 1.5rem', lineHeight: 1.6, color: '#6b6259' }}>
            Sayfa yüklenirken beklenmedik bir hata oluştu. Tekrar denemek genellikle işe yarar.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              border: 'none',
              borderRadius: '9999px',
              padding: '0.75rem 1.75rem',
              fontSize: '0.95rem',
              fontWeight: 600,
              color: '#fff',
              background: '#c2410c',
              cursor: 'pointer',
            }}
          >
            Tekrar dene
          </button>
        </div>
      </body>
    </html>
  )
}
