import { config } from './config.js';
import { ErrorTracking } from './services/errorTracking.js';
import { scheduleCampaignProcessor, stopCampaignProcessor } from './services/notifications.js';
import { postgresHealthCheck, prisma } from './services/postgres/prisma.js';
import logger from './utils/logger.js';

async function stop(signal: string): Promise<void> {
  logger.info({ signal }, '[CampaignWorker] Stopping');
  await stopCampaignProcessor();
  await prisma.$disconnect();
}

async function start(): Promise<void> {
  ErrorTracking.init();
  if (!config.postgresPrismaUrl) {
    throw new Error('PostgreSQL is not configured');
  }
  if (!await postgresHealthCheck({ logFailure: true })) {
    throw new Error('PostgreSQL is unreachable');
  }

  scheduleCampaignProcessor();
  logger.info('[CampaignWorker] Campaign scheduler and durable job worker started');
}

process.once('SIGTERM', () => {
  void stop('SIGTERM').finally(() => process.exit(0));
});
process.once('SIGINT', () => {
  void stop('SIGINT').finally(() => process.exit(0));
});

start().catch((error) => {
  logger.fatal({ err: error }, '[CampaignWorker] Startup failed');
  process.exit(1);
});
