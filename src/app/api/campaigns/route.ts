import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getTargetContacts } from '@/worker/dispatcher';
import { requireAuth, requireRole } from '@/lib/auth/rbac';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  if ('response' in authResult) return authResult.response;

  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        template: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  // Campaign creation/launch is ADMIN-only: bare requireAuth let any MEMBER (or
  // VIEWER) create and immediately start real WhatsApp broadcasts.
  const authResult = await requireRole(request, ['SUPER_ADMIN', 'ADMIN']);
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json();
    const {
      name,
      templateId,
      audienceFilter,
      variableMappings,
      headerMediaUrl,
      scheduledAt,
      startImmediately = true,
    } = body;

    if (!name || !templateId) {
      return NextResponse.json(
        { error: 'Campaign name and template are required' },
        { status: 400 }
      );
    }

    const filterString = typeof audienceFilter === 'string' ? audienceFilter : JSON.stringify(audienceFilter || {});
    const mappingString = typeof variableMappings === 'string' ? variableMappings : JSON.stringify(variableMappings || {});

    // Compute matching target contacts
    const targetContacts = await getTargetContacts(filterString);

    const campaign = await prisma.campaign.create({
      data: {
        name,
        templateId,
        audienceFilter: filterString,
        variableMappings: mappingString,
        headerMediaUrl: headerMediaUrl?.trim() || null,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
        totalContacts: targetContacts.length,
        // 2026-09 containment: campaigns can be created and scheduled, but never
        // auto-dispatched. The dispatcher resolves audiences using only singular
        // groupId/tagId while the wizard/preview use includeGroups/includeTags, so a
        // startImmediately campaign would broadcast to EVERY active contact instead
        // of the previewed audience. Dispatch goes through /api/campaigns/[id]/dispatch,
        // which currently returns 409 until audience resolution is unified.
        status: scheduledAt ? 'SCHEDULED' : 'DRAFT',
      },
      include: {
        template: true,
      },
    });

    return NextResponse.json({
      success: true,
      campaign,
      note:
        'Dispatch is temporarily disabled pending an audience-resolution fix; the campaign was saved as ' + campaign.status + '.',
    });
  } catch (error: any) {
    logger.error({ error }, 'Error creating campaign');
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
