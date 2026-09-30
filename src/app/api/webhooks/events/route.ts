import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth/rbac'
import { WEBHOOK_EVENTS } from '@/lib/webhook-events'

/** The catalog of events an endpoint can subscribe to (single source: lib/webhook-events.ts). */
export async function GET(request: NextRequest) {
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN'])
  if ('response' in authResult) return authResult.response

  return NextResponse.json(
    Object.entries(WEBHOOK_EVENTS).map(([name, meta]) => ({ name, label: meta.label, data: meta.data }))
  )
}
