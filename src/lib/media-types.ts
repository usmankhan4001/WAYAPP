/**
 * File types the chat may upload. Strict allow-list: HTML/SVG/XML/JS are rejected outright
 * (stored-XSS risk when served back from the same origin).
 */
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'audio/ogg': '.ogg',
  'audio/mpeg': '.mp3',
  'audio/mp4': '.m4a',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  // Office files WhatsApp accepts as documents
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'application/vnd.ms-powerpoint': '.ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': '.pptx',
}

/**
 * Browsers report recorded audio with a codec suffix ("audio/ogg; codecs=opus"). Only the type
 * itself matters for the allow-list, so drop the parameters and the case.
 */
export function normalizeMime(raw: string | null | undefined): string {
  const base = (raw || '').split(';')[0].trim().toLowerCase()
  return base || 'application/octet-stream'
}
