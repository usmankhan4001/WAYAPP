import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dispatchCampaign, getTargetContacts } from '@/worker/dispatcher';
import { requireAuth } from '@/lib/auth/rbac';

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
  const authResult = await requireAuth(request);
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
        status: startImmediately ? 'QUEUED' : 'DRAFT',
      },
      include: {
        template: true,
      },
    });

    if (startImmediately && targetContacts.length > 0) {
      // Trigger dispatcher in background (idempotent — the exclusive lock
      // guarantees a campaign is only ever dispatched by one runner)
      dispatchCampaign(campaign.id).catch((err) => {
        console.error('Error starting campaign dispatcher:', err);
      });
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
