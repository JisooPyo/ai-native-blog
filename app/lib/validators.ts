const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
const HTML_SPECIAL_CHARS = /[<>"'&]/

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  if (email.length > 320) return false
  if (HTML_SPECIAL_CHARS.test(email)) return false
  return EMAIL_REGEX.test(email)
}

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim()
}
