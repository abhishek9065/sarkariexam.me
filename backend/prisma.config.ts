import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const deriveNeonDirectUrl = (value?: string) => {
  if (!value) return undefined;

  try {
    const url = new URL(value);
    if (!url.hostname.includes('-pooler.')) {
      return undefined;
    }
    url.hostname = url.hostname.replace('-pooler.', '.');
    return url.toString();
  } catch {
    return undefined;
  }
};

const optionalEnv = (value?: string) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

const datasourceUrl =
  optionalEnv(process.env.POSTGRES_DIRECT_URL) ??
  optionalEnv(process.env.DIRECT_URL) ??
  deriveNeonDirectUrl(optionalEnv(process.env.POSTGRES_PRISMA_URL) ?? optionalEnv(process.env.DATABASE_URL)) ??
  optionalEnv(process.env.POSTGRES_PRISMA_URL) ??
  optionalEnv(process.env.DATABASE_URL);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: datasourceUrl,
  },
});
