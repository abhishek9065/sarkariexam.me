import { Prisma, PrismaClient } from '@prisma/client';

import { config } from '../../config.js';

type GlobalWithPrisma = typeof globalThis & {
  __prismaClient?: PrismaClient;
};

const globalRef = globalThis as GlobalWithPrisma;

const prismaLogLevels: Prisma.LogLevel[] = config.isProduction
  ? ['error']
  : ['error', 'warn'];

const prismaDatasourceUrl = config.postgresPrismaUrl;
const prismaDirectUrl = config.postgresDirectUrl;

const prismaClientOptions: Prisma.PrismaClientOptions = {
  log: prismaLogLevels,
};

if (prismaDatasourceUrl) {
  prismaClientOptions.datasources = {
    db: {
      url: prismaDatasourceUrl,
    },
  };
}

// Add directUrl support for Neon if configured
if (prismaDirectUrl && prismaClientOptions.datasources?.db) {
  (prismaClientOptions.datasources.db as any).directUrl = prismaDirectUrl;
}

export const prisma = globalRef.__prismaClient ?? new PrismaClient(prismaClientOptions);

// Prisma's generated default type surface can lag behind the generated model set in this workspace.
// Keep the runtime client canonical, and add a narrow typed bridge for newly migrated app_* slices.
export const prismaApp = prisma as PrismaClient & {
  workflowLogEntry: {
    findMany(args: any): Promise<any[]>;
    create(args: any): Promise<any>;
  };
  siteSettingRecord: {
    findUnique(args: any): Promise<any>;
    upsert(args: any): Promise<any>;
  };
  pushSubscriptionEntry: {
    findMany(args: any): Promise<any[]>;
    upsert(args: any): Promise<any>;
    count(args?: any): Promise<number>;
  };
  bookmarkEntry: {
    findMany(args: any): Promise<any[]>;
    create(args: any): Promise<any>;
    deleteMany(args: any): Promise<{ count: number }>;
  };
  errorReportEntry: {
    create(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
    count(args?: any): Promise<number>;
    updateMany(args: any): Promise<{ count: number }>;
  };
  notificationCampaignEntry: {
    create(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
    findUnique(args: any): Promise<any>;
    updateMany(args: any): Promise<{ count: number }>;
    deleteMany(args: any): Promise<{ count: number }>;
  };
  userNotificationEntry: {
    findMany(args: any): Promise<any[]>;
    count(args?: any): Promise<number>;
    updateMany(args: any): Promise<{ count: number }>;
    create(args: any): Promise<any>;
  };
  savedSearchEntry: {
    findMany(args: any): Promise<any[]>;
    create(args: any): Promise<any>;
    findFirst(args: any): Promise<any>;
    updateMany(args: any): Promise<{ count: number }>;
    deleteMany(args: any): Promise<{ count: number }>;
  };
  trackedApplicationEntry: {
    findMany(args: any): Promise<any[]>;
    create(args: any): Promise<any>;
    findFirst(args: any): Promise<any>;
    updateMany(args: any): Promise<{ count: number }>;
    deleteMany(args: any): Promise<{ count: number }>;
    upsert(args: any): Promise<any>;
  };
  analyticsEvent: {
    create(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
    count(args?: any): Promise<number>;
    aggregate(args: any): Promise<any>;
    groupBy(args: any): Promise<any[]>;
  };
  analyticsRollup: {
    findMany(args: any): Promise<any[]>;
    findUnique(args: any): Promise<any>;
    upsert(args: any): Promise<any>;
    update(args: any): Promise<any>;
  };
  securityLog: {
    create(args: any): Promise<any>;
    findMany(args: any): Promise<any[]>;
    count(args?: any): Promise<number>;
    update(args: any): Promise<any>;
    findUnique(args: any): Promise<any>;
    deleteMany(args: any): Promise<{ count: number }>;
  };
  userFeedback: {
    findMany(args: any): Promise<any[]>;
    count(args?: any): Promise<number>;
  };
  communityComment: {
    findMany(args: any): Promise<any[]>;
    update(args: any): Promise<any>;
    count(args?: any): Promise<number>;
  };
  userProfileEntry: {
    findUnique(args: any): Promise<any>;
    create(args: any): Promise<any>;
    updateMany(args: any): Promise<{ count: number }>;
  };
  userAccountEntry: {
    findUnique(args: any): Promise<any>;
    findFirst(args: any): Promise<any>;
    create(args: any): Promise<any>;
    update(args: any): Promise<any>;
    deleteMany(args: any): Promise<{ count: number }>;
    findMany(args: any): Promise<any[]>;
    count(args?: any): Promise<number>;
  };
  reminderDispatchLogEntry: {
    create(args: any): Promise<any>;
  };
};

if (process.env.NODE_ENV !== 'production') {
  globalRef.__prismaClient = prisma;
}

export async function postgresHealthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1 FROM _prisma_migrations LIMIT 1`;
    return true;
  } catch (error) {
    console.error('Postgres health check failed (migrations might be pending):', error);
    return false;
  }
}

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
}
