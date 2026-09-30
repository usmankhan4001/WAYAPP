import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/rbac'
import { logger } from '@/lib/logger'

const STATUSES = ['PENDING', 'DELIVERED', 'FAILED']

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN'])
  if ('response' in authResult) return authResult.response

  try {
    const { searchParams } = new URL(request.url)
    const endpointId = searchParams.get('endpointId')
    const status = searchParams.get('status')?.toUpperCase()
    if (status && !STATUSES.includes(status)) {
      return NextResponse.json({ error: `status must be one of ${STATUSES.join(', ')}` }, { status: 400 })
    }
    const limit = Math.min(200, Math.max(1, Number(searchParams.get('limit')) || 50))

    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        ...(endpointId ? { endpointId } : {}),
        ...(status ? { status } : {}),
      },
      include: {
        endpoint: { select: { id: true, name: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(deliveries)
  } catch (error: any) {
    logger.error({ error }, 'Error fetching webhook deliveries')
    return NextResponse.json({ error: 'Failed to retrieve deliveries' }, { status: 500 })
  }
}
