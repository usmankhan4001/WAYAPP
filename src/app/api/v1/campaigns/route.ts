import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { authenticateApiRequest } from '@/lib/api/auth';
import { dispatchCampaign } from '@/worker/dispatcher';
import { logger } from '@/lib/logger';

const CampaignCreateSchema = z.object({
  name: z.string().min(1),
  templateId: z.string(),
  audienceFilter: z.record(z.string(), z.any()).optional(),
  variableMappings: z.record(z.string(), z.string()).optional(),
  headerMediaUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().optional(),
  startImmediately: z.boolean().default(false),
});

export async function GET(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'campaigns:read');
  if ('response' in authResult) return authResult.response;

  try {
    const campaigns = await prisma.campaign.findMany({
      include: {
        template: { select: { id: true, name: true, language: true, category: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(campaigns);
  } catch (error: any) {
    logger.error({ error }, 'Error in v1 campaigns list');
    return NextResponse.json({ error: 'Failed to retrieve campaigns' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authResult = await authenticateApiRequest(request, 'campaigns:write');
  if ('response' in authResult) return authResult.response;

  try {
    const body = await request.json().catch(() => ({}));
    const parseResult = CampaignCreateSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0]?.message || 'Invalid campaign payload' },
        { status: 400 }
      );
    }

    const {
      name,
      templateId,
      audienceFilter = {},
      variableMappings = {},
      headerMediaUrl,
      scheduledAt,
      startImmediately,
    } = parseResult.data;

    const template = await prisma.template.findUnique({ where: { id: templateId } });
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    const status = scheduledAt ? 'SCHEDULED' : startImmediately ? 'QUEUED' : 'DRAFT';

    const campaign = await prisma.campaign.create({
      data: {
        name,
        templateId,
        audienceFilter: JSON.stringify(audienceFilter),
        variableMappings: JSON.stringify(variableMappings),
        headerMediaUrl: headerMediaUrl || null,
        status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      },
    });

    if (startImmediately && !scheduledAt) {
      dispatchCampaign(campaign.id).catch((err) => {
        logger.error({ campaignId: campaign.id, err }, 'Immediate dispatch error');
      });
    }

    return NextResponse.json({ success: true, campaign }, { status: 201 });
  } catch (error: any) {
    logger.error({ error }, 'Error creating v1 campaign');
    return NextResponse.json({ error: 'Failed to create campaign' }, { status: 500 });
  }
}
