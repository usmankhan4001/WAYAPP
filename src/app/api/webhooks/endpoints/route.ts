import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/rbac'
import { logger } from '@/lib/logger'
import { checkWebhookUrl } from '@/lib/api/ssrf'
import { DEFAULT_WEBHOOK_EVENTS, normalizeEvents, publicEndpoint } from '@/lib/api/webhook-input'

export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN'])
  if ('response' in authResult) return authResult.response

  try {
    const endpoints = await prisma.webhookEndpoint.findMany({
      include: {
        _count: { select: { deliveries: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(endpoints.map(publicEndpoint))
  } catch (error: any) {
    logger.error({ error }, 'Error fetching webhook endpoints')
    return NextResponse.json({ error: 'Failed to retrieve endpoints' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN'])
  if ('response' in authResult) return authResult.response

  try {
    const body = await request.json().catch(() => ({}))
    const { name, url, events = DEFAULT_WEBHOOK_EVENTS } = body

    if (!name?.trim() || !url?.trim()) {
      return NextResponse.json({ error: 'Endpoint name and URL are required' }, { status: 400 })
    }

    const safe = await checkWebhookUrl(url)
    if (!safe.ok) return NextResponse.json({ error: safe.reason }, { status: 400 })

    const checked = normalizeEvents(events)
    if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })

    // Random HMAC signing secret. Returned to the caller once, here, and never again.
    const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`

    const endpoint = await prisma.webhookEndpoint.create({
      data: {
        name: name.trim(),
        url: safe.url.toString(),
        secret,
        events: checked.events,
        isActive: true,
      },
    })

    return NextResponse.json({ success: true, endpoint: publicEndpoint(endpoint), secret })
  } catch (error: any) {
    logger.error({ error }, 'Error creating webhook endpoint')
    return NextResponse.json({ error: 'Failed to create webhook endpoint' }, { status: 500 })
  }
}
