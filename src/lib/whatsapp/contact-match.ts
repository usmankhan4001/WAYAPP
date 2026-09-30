import { prisma } from '@/lib/prisma'

export interface InboundContactMatch {
  contact: any
  /** true when found by exact number; false when found by the last-9-digits fallback */
  exact: boolean
}

/**
 * Finds the contact an inbound WhatsApp message belongs to.
 *
 * 1. Exact match on the normalised E.164 number (then the legacy stored variants).
 * 2. Only if that finds nobody: a last-9-digits match, accepted ONLY when exactly one contact
 *    matches. Two people can share a national-number tail (different country codes), so an
 *    ambiguous tail is treated as "no match" and a new contact is created.
 *
 * Callers must not rewrite phoneNumber on a fuzzy (exact: false) match.
 */
export async function findInboundContact(rawFrom: string, normalizedPhone: string): Promise<InboundContactMatch | null> {
  const digits = rawFrom.replace(/[^0-9]/g, '')

  const exactNormalised = await prisma.contact.findFirst({ where: { phoneNumber: normalizedPhone } })
  if (exactNormalised) return { contact: exactNormalised, exact: true }

  const variant = await prisma.contact.findFirst({
    where: { OR: [{ phoneNumber: digits }, { phoneNumber: `+${digits}` }] },
  })
  if (variant) return { contact: variant, exact: true }

  if (digits.length >= 8) {
    const tail = await prisma.contact.findMany({
      where: { phoneNumber: { endsWith: digits.slice(-9) } },
      take: 2,
    })
    if (tail.length === 1) return { contact: tail[0], exact: false }
  }
  return null
}
