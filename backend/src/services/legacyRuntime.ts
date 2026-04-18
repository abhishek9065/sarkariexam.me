import type logger from '../utils/logger.js';

export const legacyMongoBackedApiPrefixes = [
  '/api/admin',
  '/api/push',
  '/api/community',
  '/api/support',
] as const;

export const legacyMongoScheduledSubsystems = [
  {
    id: 'automation-jobs',
    description: 'Automation link-health records still persist through Mongo-compatible collections while content-state actions run from Prisma/Postgres',
  },
] as const;

export function getLegacyRuntimeDiagnostics(legacyMongoConfigured: boolean) {
  return {
    configured: legacyMongoConfigured,
    requiredForCoreContent: false,
    guardedApiPrefixes: [...legacyMongoBackedApiPrefixes],
    scheduledSubsystems: legacyMongoScheduledSubsystems.map((item) => ({
      id: item.id,
      description: item.description,
    })),
  };
}

export async function startLegacyMongoRuntime(deps: {
  logger: typeof logger;
  scheduleAnalyticsRollups: () => Promise<void>;
  scheduleAutomationJobs: () => void;
}) {
  deps.logger.info(
    {
      scheduledSubsystems: legacyMongoScheduledSubsystems.map((item) => item.id),
    },
    '[LegacyRuntime] Starting Mongo/Cosmos-backed transitional subsystems',
  );

  // Analytics now run from Postgres via prismaApp, but we still trigger the rollup scheduler here for consistency
  // since the initialization logic was already wired through startLegacyMongoRuntime.
  await deps.scheduleAnalyticsRollups().catch((error) => {
    deps.logger.error({ err: error }, '[LegacyRuntime] Analytics rollup init failed');
  });
  
  deps.scheduleAutomationJobs();
}
