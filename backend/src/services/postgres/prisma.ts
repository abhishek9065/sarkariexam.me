import { Prisma, PrismaClient } from '@prisma/client';

type GlobalWithPrisma = typeof globalThis & {
  __prismaClient?: PrismaClient;
};

const globalRef = globalThis as GlobalWithPrisma;

const prismaLogLevels: Prisma.LogLevel[] = process.env.NODE_ENV === 'production'
  ? ['error']
  : ['error', 'warn'];

export const prisma = globalRef.__prismaClient ?? new PrismaClient({
  log: prismaLogLevels,
});

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
