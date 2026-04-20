import type logger from '../utils/logger.js';

// Transitional boundary only. Keep this list explicit until each prefix is verified bridge-free.
export const legacyMongoBackedApiPrefixes = [] as const;

export const legacyMongoCompatibilitySurfaces = [
  {
    id: 'backup-metadata',
    description: 'Admin backup metadata still reads/writes a legacy Mongo collection when configured',
  },
  {
    id: 'security-audit-history',
    description: 'Security audit history can read from a legacy Mongo collection when configured',
  },
  {
    id: 'migration-and-backfill-scripts',
    description: 'Migration and backfill scripts still use Mongo/Cosmos as a transitional source',
  },
] as const;

export function getLegacyRuntimeDiagnostics(legacyMongoConfigured: boolean) {
  return {
    configured: legacyMongoConfigured,
    requiredForCoreContent: false,
    guardedApiPrefixes: [...legacyMongoBackedApiPrefixes],
    startupCoupledSubsystems: [] as string[],
    compatibilitySurfaces: legacyMongoCompatibilitySurfaces.map((item) => ({
      id: item.id,
      description: item.description,
    })),
  };
}

export async function startLegacyMongoRuntime(deps: {
  logger: typeof logger;
}) {
  deps.logger.info(
    {
      guardedApiPrefixes: legacyMongoBackedApiPrefixes,
      compatibilitySurfaces: legacyMongoCompatibilitySurfaces.map((item) => item.id),
    },
    '[LegacyRuntime] Legacy Mongo/Cosmos bridge connected for compatibility-only surfaces',
  );
}
