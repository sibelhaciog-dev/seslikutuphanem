# Dokümantasyon

Bu klasör projenin "neden" ve "nasıl"ını tutar. Kod ne yaptığını anlatır;
buradaki dosyalar neden öyle yapıldığını.

## Nereden başlamalı

| Soru                           | Dosya                              |
| ------------------------------ | ---------------------------------- |
| Ürün ne yapıyor, kime, neden?  | [prd.md](prd.md)                   |
| Sistem nasıl kurulu?           | [architecture.md](architecture.md) |
| Veritabanında ne var?          | [data-model.md](data-model.md)     |
| Şu karar neden böyle alındı?   | [decisions/](decisions/)           |
| Sırada ne var?                 | [roadmap.md](roadmap.md)           |
| Yapay zekâ nasıl bağlı?        | [ai.md](ai.md)                     |
| Nasıl kurarım / yayına alırım? | [operations.md](operations.md)     |

## Güncel tutma kuralı

Bir değişiklik yaparken şu tablodaki eşleşmeye bakın:

| Değişiklik                           | Güncellenecek doküman                                  |
| ------------------------------------ | ------------------------------------------------------ |
| Veritabanı şeması                    | `data-model.md` + `src/lib/supabase/database.types.ts` |
| Yeni sayfa, yeni katman, veri akışı  | `architecture.md`                                      |
| Yeni özellik veya kapsam değişikliği | `prd.md`                                               |
| Geri döndürülmesi zor teknik seçim   | `decisions/` altına yeni ADR                           |
| Ortam değişkeni, kurulum adımı       | `operations.md` + `.env.example`                       |
| Tamamlanan veya eklenen iş           | `roadmap.md`                                           |

Bu kural `CLAUDE.md` içinde de yazılıdır; asistan değişiklikle birlikte
dokümanı da günceller.
