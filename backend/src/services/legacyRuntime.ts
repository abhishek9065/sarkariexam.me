import type logger from '../utils/logger.js';

export const legacyMongoBackedApiPrefixes = [
  '/api/admin',
] as const;

export const legacyMongoScheduledSubsystems = [
  {
    id: 'analytics-rollups',
    description: 'Analytics rollups persisted through Mongo-compatible collections',
  },
  {
    id: 'digest-sender',
    description: 'Digest delivery scheduler still depends on legacy Mongo-backed subscriber state',
  },
  {
    id: 'saved-search-alerts',
    description: 'Saved-search alerts still read legacy Mongo-compatible saved_searches/user_notifications collections',
  },
  {
    id: 'tracker-reminders',
    description: 'Tracker reminders still read legacy Mongo-compatible tracked_applications/user_notifications collections',
  },
  {
    id: 'automation-jobs',
    description: 'Automation/link-health jobs still persist legacy Mongo-compatible operational records',
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
  scheduleDigestSender: () => void;
  scheduleTrackerReminders: () => void;
  scheduleSavedSearchAlerts: () => void;
  scheduleAutomationJobs: () => void;
}) {
  deps.logger.info(
    {
      scheduledSubsystems: legacyMongoScheduledSubsystems.map((item) => item.id),
    },
    '[LegacyRuntime] Starting Mongo/Cosmos-backed transitional subsystems',
  );

  await deps.scheduleAnalyticsRollups().catch((error) => {
    deps.logger.error({ err: error }, '[LegacyRuntime] Analytics rollup init failed');
  });
  deps.scheduleDigestSender();
  deps.scheduleTrackerReminders();
  deps.scheduleSavedSearchAlerts();
  deps.scheduleAutomationJobs();
}
