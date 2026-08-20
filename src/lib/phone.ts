/** Türkiye telefon numarasını WhatsApp bağlantısı için normalleştirir. */
export function toWhatsAppNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) digits = digits.slice(1)
  if (!digits.startsWith('90')) digits = `90${digits}`
  return digits
}

/** Basit doğrulama: Türkiye cep telefonu 10 haneli (5xx xxx xx xx). */
export function isValidTurkishPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '').replace(/^0/, '').replace(/^90/, '')
  return /^5\d{9}$/.test(digits)
}
