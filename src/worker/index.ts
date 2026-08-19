import http from 'http';
import { pollScheduledCampaigns } from './scheduler';
import { sweepStuckCampaigns, reconcileCampaignCounters } from './sweeper';
import { processOutboundWebhooks } from './outbound-webhooks';
import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/logger';

let isRunning = true;

async function startWorker() {
  logger.info('🚀 WAYAPP Background Worker Started');

  // Health probe endpoint for container orchestration / healthchecks
  const healthPort = Number(process.env.WORKER_HEALTH_PORT || 3001);
  const healthServer = http.createServer(async (req, res) => {
    if (req.url === '/health') {
      try {
        await prisma.$queryRaw`SELECT 1`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', running: isRunning }));
      } catch {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'db_unreachable' }));
      }
      return;
    }
    res.writeHead(404);
    res.end();
  });
  healthServer.listen(healthPort, () => {
    logger.info(`Worker health endpoint listening on :${healthPort}`);
  });

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
    healthServer.close(() => process.exit(0));
    // Safety net if keep-alive connections hold the server open
    setTimeout(() => process.exit(0), 3000).unref();
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startWorker().catch((err) => {
  logger.error({ err }, 'Fatal error in worker startup');
  process.exit(1);
});
