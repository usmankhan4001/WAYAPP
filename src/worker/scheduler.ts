import { prisma } from '@/lib/prisma';
import { dispatchCampaign } from './dispatcher';
import { logger } from '@/lib/logger';

/**
 * Polls for scheduled campaigns that are ready to run
 */
export async function pollScheduledCampaigns(): Promise<void> {
  try {
    const now = new Date();
    const readyCampaigns = await prisma.campaign.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { lte: now },
      },
      select: { id: true, name: true },
    });

    for (const campaign of readyCampaigns) {
      logger.info({ campaignId: campaign.id, name: campaign.name }, '[Scheduler] Triggering scheduled campaign');
      // Update to QUEUED and dispatch
      await prisma.campaign.update({
        where: { id: campaign.id },
        data: { status: 'QUEUED' },
      });

      dispatchCampaign(campaign.id).catch((err) => {
        logger.error({ campaignId: campaign.id, err }, '[Scheduler] Error running scheduled campaign');
      });
    }
  } catch (error) {
    logger.error({ error }, '[Scheduler] Error in scheduler poll cycle');
  }
}
