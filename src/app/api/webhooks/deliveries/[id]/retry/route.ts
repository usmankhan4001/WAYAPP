import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/rbac'
import { logger } from '@/lib/logger'

/** Puts a delivery back in the queue; the worker picks it up on its next cycle. */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN'])
  if ('response' in authResult) return authResult.response

  try {
    const { id } = await params
    const delivery = await prisma.webhookDelivery.findUnique({ where: { id }, select: { id: true, status: true } })
    if (!delivery) return NextResponse.json({ error: 'Delivery not found' }, { status: 404 })
    if (delivery.status === 'DELIVERED') {
      return NextResponse.json({ error: 'This one was already delivered' }, { status: 409 })
    }

    await prisma.webhookDelivery.update({
      where: { id },
      data: { status: 'PENDING', attempts: 0, nextRetryAt: null, lastError: null },
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error({ error }, 'Error retrying webhook delivery')
    return NextResponse.json({ error: 'Failed to retry delivery' }, { status: 500 })
  }
}
