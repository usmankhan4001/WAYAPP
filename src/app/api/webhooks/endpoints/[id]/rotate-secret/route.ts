import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/rbac'
import { logger } from '@/lib/logger'

/** Issues a new signing secret. The old one stops working at once; the new one is returned once. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN'])
  if ('response' in authResult) return authResult.response

  try {
    const { id } = await params
    const existing = await prisma.webhookEndpoint.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })

    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`
    await prisma.webhookEndpoint.update({ where: { id }, data: { secret } })
    return NextResponse.json({ success: true, secret })
  } catch (error: any) {
    logger.error({ error }, 'Error rotating webhook secret')
    return NextResponse.json({ error: 'Failed to rotate secret' }, { status: 500 })
  }
}
