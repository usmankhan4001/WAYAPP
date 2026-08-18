import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CampaignDispatcher } from '@/lib/whatsapp/queue';

export async function GET() {
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
    const targetContacts = await CampaignDispatcher.getTargetContacts(filterString);

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
      // Trigger dispatcher in background
      CampaignDispatcher.startCampaign(campaign.id).catch((err) => {
        console.error('Error starting campaign dispatcher:', err);
      });
    }

    return NextResponse.json({ success: true, campaign });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
