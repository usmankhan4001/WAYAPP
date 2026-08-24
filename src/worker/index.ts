import { pollScheduledCampaigns } from './scheduler';
import { sweepStuckCampaigns, reconcileCampaignCounters } from './sweeper';
import { processOutboundWebhooks } from './outbound-webhooks';
import { logger } from '@/lib/logger';
import { setupGracefulShutdown } from '@/lib/graceful-shutdown';

let isRunning = true;

async function startWorker() {
  setupGracefulShutdown();
  logger.info('🚀 WAYAPP Background Worker Started');

  // Liveness heartbeat & memory check (every 60s)
  setInterval(() => {
    const memoryUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);
    if (heapUsedMB > 400) {
      logger.warn({ heapUsedMB }, '⚠️ Worker memory usage is high (over 400MB)');
    }
  }, 60000);

  // Initial recovery sweeper on boot
  await sweepStuckCampaigns();

  // 1. Scheduler interval (every 15s)
  const schedulerTimer = setInterval(async () => {
    if (!isRunning) return;
    await pollScheduledCampaigns();
  }, 15000);

  // 2. Sweeper interval (every 60s)
  const sweeperTimer = setInterval(async () => {
    if (!isRunning) return;
    await sweepStuckCampaigns();
  }, 60000);

  // 3. Counter reconciliation interval (every 5 mins)
  const reconcilerTimer = setInterval(async () => {
    if (!isRunning) return;
    await reconcileCampaignCounters();
  }, 5 * 60 * 1000);

  // 4. Outbound webhooks delivery interval (every 5s)
  const webhookTimer = setInterval(async () => {
    if (!isRunning) return;
    await processOutboundWebhooks();
  }, 5000);

  const shutdown = () => {
    logger.info('Shutting down WAYAPP Worker gracefully...');
    isRunning = false;
    clearInterval(schedulerTimer);
    clearInterval(sweeperTimer);
    clearInterval(reconcilerTimer);
    clearInterval(webhookTimer);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startWorker().catch((err) => {
  logger.error({ err }, 'Fatal error in worker startup');
  process.exit(1);
});
