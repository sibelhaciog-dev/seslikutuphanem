# ADR 0003 — OpenAI uyumlu tek yapay zekâ arayüzü

**Durum:** Kabul edildi · **Tarih:** 2026-08-20
**Yerini aldığı:** Doğrudan Anthropic SDK kullanımı

## Bağlam

v1'de tarayıcıdan doğrudan `api.anthropic.com` adresine istek atılıyordu.
Bu çağrı hiç çalışmadı (anahtar yoktu, CORS engelliyordu) ve çalışsaydı bile
anahtarı ifşa edecekti.

v2'de iki ayrı yapay zekâ ihtiyacı var:

- **Görsel:** kitap kapağı fotoğrafından kitap tanıma
- **Metin:** okuma raporuna kişisel bir yorum yazma

Sağlayıcı bağımlılığı istemiyoruz; model fiyatları ve kalitesi hızla değişiyor.

## Karar

Tüm yapay zekâ çağrıları **OpenAI uyumlu bir uç noktaya** yapılır. Varsayılan
sağlayıcı **OpenRouter**. Resmî `openai` paketi, taban adresi değiştirilerek
kullanılır.

Dört ortam değişkeni:

| Değişken          | Anlamı                 | Örnek                          |
| ----------------- | ---------------------- | ------------------------------ |
| `AI_BASE_URL`     | OpenAI uyumlu uç nokta | `https://openrouter.ai/api/v1` |
| `AI_API_KEY`      | Sağlayıcı anahtarı     | `sk-or-v1-…`                   |
| `AI_TEXT_MODEL`   | Metin üretimi modeli   | `anthropic/claude-sonnet-4.5`  |
| `AI_VISION_MODEL` | Görsel tanıma modeli   | `google/gemini-2.5-flash`      |

Metin ve görsel modelleri ayrı tutulur: görsel işler ucuz ve hızlı bir modelle,
metin işleri kaliteli bir modelle yapılabilsin.

## Gerekçe

- **Sağlayıcı değiştirmek tek satır.** OpenRouter, OpenAI, yerel bir vLLM
  sunucusu veya Azure — hepsi aynı arayüz.
- **Model değiştirmek yeniden yayın gerektirmez.** Ortam değişkeni yeterli.
- **Tek istemci, tek hata yönetimi.** `src/lib/ai/client.ts` tüm çağrıları
  sarar; JSON ayrıştırma ve şema doğrulama tek yerde.

## Sonuçlar

- Yanıt biçimi modele göre değişebilir. Her yapılandırılmış çağrı için
  `response_format: json_schema` denenir; sağlayıcı desteklemezse istem
  içindeki talimatla JSON istenir ve yanıt Zod ile doğrulanır. İki katmanlı
  bu yaklaşım model bağımsızdır.
- `AI_API_KEY` tanımlı değilse yapay zekâ özellikleri kapanır, ürünün geri
  kalanı çalışır (`aiEnabled()` kontrolü).
- OpenRouter'a `HTTP-Referer` ve `X-Title` başlıkları gönderilir; sağlayıcı
  panelinde kullanım bu isimle görünür.
- Yapay zekâ uçları kimlik doğrulama ve kullanıcı başına hız sınırı arkasında.
