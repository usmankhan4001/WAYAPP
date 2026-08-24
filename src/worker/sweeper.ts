import { prisma } from '@/lib/prisma';
import { dispatchCampaign } from './dispatcher';
import { logger } from '@/lib/logger';

/**
 * Recovers campaigns stuck in RUNNING or QUEUED state without progress for > 5 minutes
 */
export async function sweepStuckCampaigns(): Promise<void> {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const stuckCampaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['RUNNING', 'QUEUED'] },
        updatedAt: { lte: fiveMinutesAgo },
      },
    });

    for (const campaign of stuckCampaigns) {
      const pendingCount = await prisma.campaignMessage.count({
        where: {
          campaignId: campaign.id,
          status: { in: ['PENDING', 'SENDING'] },
        },
      });

      if (pendingCount > 0) {
        logger.warn({ campaignId: campaign.id, pendingCount }, '[Sweeper] Resuming stranded campaign');
        // Reset any messages stuck in SENDING back to PENDING
        await prisma.campaignMessage.updateMany({
          where: {
            campaignId: campaign.id,
            status: 'SENDING',
          },
          data: { status: 'PENDING' },
        });

        dispatchCampaign(campaign.id).catch((err) => {
          logger.error({ campaignId: campaign.id, err }, '[Sweeper] Error resuming campaign');
        });
      } else {
        // No pending messages remaining — decide final state:
        // FAILED if every message ended in an error, COMPLETED otherwise
        const [failedCount, deliveredOrBetter] = await Promise.all([
          prisma.campaignMessage.count({
            where: { campaignId: campaign.id, status: 'FAILED' },
          }),
          prisma.campaignMessage.count({
            where: {
              campaignId: campaign.id,
              status: { in: ['SENT', 'DELIVERED', 'READ', 'REPLIED'] },
            },
          }),
        ]);

        const finalStatus = deliveredOrBetter === 0 && failedCount > 0 ? 'FAILED' : 'COMPLETED';

        await prisma.campaign.update({
          where: { id: campaign.id },
          data: {
            status: finalStatus,
            completedAt: new Date(),
          },
        });
        logger.info({ campaignId: campaign.id, finalStatus }, '[Sweeper] Finalized stranded campaign');
      }
    }
  } catch (error) {
    logger.error({ error }, '[Sweeper] Error sweeping stuck campaigns');
  }
}

/**
 * Reconciles aggregated analytics counters from CampaignMessage rows
 */
export async function reconcileCampaignCounters(): Promise<void> {
  try {
    const activeCampaigns = await prisma.campaign.findMany({
      where: {
        status: { in: ['RUNNING', 'COMPLETED', 'PAUSED'] },
      },
      select: { id: true },
    });

    for (const { id } of activeCampaigns) {
      const [total, sent, delivered, read, replied, failed] = await Promise.all([
        prisma.campaignMessage.count({ where: { campaignId: id } }),
        prisma.campaignMessage.count({ where: { campaignId: id, status: { in: ['SENT', 'DELIVERED', 'READ', 'REPLIED'] } } }),
        prisma.campaignMessage.count({ where: { campaignId: id, status: { in: ['DELIVERED', 'READ', 'REPLIED'] } } }),
        prisma.campaignMessage.count({ where: { campaignId: id, status: { in: ['READ', 'REPLIED'] } } }),
        prisma.campaignMessage.count({ where: { campaignId: id, status: 'REPLIED' } }),
        prisma.campaignMessage.count({ where: { campaignId: id, status: 'FAILED' } }),
      ]);

      await prisma.campaign.update({
        where: { id },
        data: {
          totalContacts: total,
          sentCount: sent,
          deliveredCount: delivered,
          readCount: read,
          repliedCount: replied,
          failedCount: failed,
        },
      });
    }
  } catch (error) {
    logger.error({ error }, '[Sweeper] Error reconciling counters');
  }
}
