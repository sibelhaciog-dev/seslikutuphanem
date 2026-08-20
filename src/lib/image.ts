/** Tarayıcıda çalışan görsel yardımcıları. */

export interface ResizedImage {
  blob: Blob
  dataUrl: string
  width: number
  height: number
}

/**
 * Seçilen fotoğrafı yüklemeden önce küçültür. Telefondan çekilen kapak
 * fotoğrafları 4-8 MB olabiliyor; kapak için 600x900 fazlasıyla yeterli.
 */
export async function resizeImage(
  file: File,
  maxWidth = 600,
  maxHeight = 900,
  quality = 0.82,
): Promise<ResizedImage> {
  const bitmap = await createImageBitmap(file)
  const ratio = Math.min(maxWidth / bitmap.width, maxHeight / bitmap.height, 1)
  const width = Math.round(bitmap.width * ratio)
  const height = Math.round(bitmap.height * ratio)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Görsel işlenemedi.')
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', quality),
  )
  if (!blob) throw new Error('Görsel dönüştürülemedi.')

  return { blob, dataUrl: canvas.toDataURL('image/jpeg', quality), width, height }
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024

export function validateImageFile(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return 'Fotoğraf çok büyük (en fazla 8 MB).'
  if (!file.type.startsWith('image/')) return 'Lütfen bir fotoğraf seçin.'
  return null
}
