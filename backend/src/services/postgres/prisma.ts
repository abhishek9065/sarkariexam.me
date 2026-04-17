import { Prisma, PrismaClient } from '@prisma/client';

type GlobalWithPrisma = typeof globalThis & {
  __prismaClient?: PrismaClient;
};

const globalRef = globalThis as GlobalWithPrisma;

const prismaLogLevels: Prisma.LogLevel[] = process.env.NODE_ENV === 'production'
  ? ['error']
  : ['error', 'warn'];

const prismaDatasourceUrl = process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL ?? '';

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
};

if (process.env.NODE_ENV !== 'production') {
  globalRef.__prismaClient = prisma;
}

export async function postgresHealthCheck(): Promise<boolean> {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
}

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
}
