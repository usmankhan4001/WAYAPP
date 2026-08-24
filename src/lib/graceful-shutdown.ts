import { logger } from './logger';
import { prisma } from './prisma';

export function setupGracefulShutdown() {
  process.on('uncaughtException', (error) => {
    logger.error({ err: error }, 'Uncaught Exception detected. Shutting down gracefully.');
    shutdown(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error({ reason, promise }, 'Unhandled Rejection detected. Shutting down gracefully.');
    shutdown(1);
  });
}

async function shutdown(code = 0) {
  try {
    logger.info('Closing database connections...');
    await prisma.$disconnect();
    logger.info('Database connections closed.');
  } catch (err) {
    logger.error({ err }, 'Error during database disconnection.');
  } finally {
    process.exit(code);
  }
}
