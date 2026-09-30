import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth/rbac'
import { loadDashboardSummary, parseRange } from '@/lib/dashboard/summary'

export const dynamic = 'force-dynamic'

// Any signed-in user (web cookie or mobile Bearer token) may read the home summary.
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request)
  if ('response' in auth) return auth.response
  try {
    const range = parseRange(new URL(request.url).searchParams.get('range'))
    const summary = await loadDashboardSummary(prisma, range)
    return NextResponse.json({ ...summary, user: { name: auth.session.name } })
  } catch (error) {
    console.error('Dashboard summary failed', error)
    return NextResponse.json({ error: 'Could not load the dashboard. Try again.' }, { status: 500 })
  }
}
