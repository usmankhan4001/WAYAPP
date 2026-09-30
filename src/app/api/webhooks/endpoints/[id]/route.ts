import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/auth/rbac'
import { logger } from '@/lib/logger'
import { checkWebhookUrl } from '@/lib/api/ssrf'
import { normalizeEvents, publicEndpoint } from '@/lib/api/webhook-input'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN'])
  if ('response' in authResult) return authResult.response

  try {
    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const data: { name?: string; url?: string; events?: string; isActive?: boolean } = {}

    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || !body.name.trim()) {
        return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
      }
      data.name = body.name.trim()
    }
    if (body.url !== undefined) {
      const safe = await checkWebhookUrl(String(body.url))
      if (!safe.ok) return NextResponse.json({ error: safe.reason }, { status: 400 })
      data.url = safe.url.toString()
    }
    if (body.events !== undefined) {
      const checked = normalizeEvents(body.events)
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 })
      data.events = checked.events
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') {
        return NextResponse.json({ error: 'isActive must be true or false' }, { status: 400 })
      }
      data.isActive = body.isActive
    }
    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const existing = await prisma.webhookEndpoint.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ error: 'Endpoint not found' }, { status: 404 })

    const endpoint = await prisma.webhookEndpoint.update({ where: { id }, data })
    return NextResponse.json({ success: true, endpoint: publicEndpoint(endpoint) })
  } catch (error: any) {
    logger.error({ error }, 'Error updating webhook endpoint')
    return NextResponse.json({ error: 'Failed to update endpoint' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN'])
  if ('response' in authResult) return authResult.response

  try {
    const { id } = await params
    await prisma.webhookEndpoint.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'Webhook endpoint deleted' })
  } catch (error: any) {
    logger.error({ error }, 'Error deleting webhook endpoint')
    return NextResponse.json({ error: 'Failed to delete endpoint' }, { status: 500 })
  }
}
