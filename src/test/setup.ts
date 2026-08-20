import '@testing-library/jest-dom/vitest'

// Testlerde Supabase istemcisi kurulmasın diye sahte ortam değişkenleri.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'test-anon-key-0123456789'
