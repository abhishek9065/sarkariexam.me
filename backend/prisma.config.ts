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

const datasourceUrl =
  process.env.POSTGRES_DIRECT_URL ??
  process.env.DIRECT_URL ??
  deriveNeonDirectUrl(process.env.POSTGRES_PRISMA_URL ?? process.env.DATABASE_URL) ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: datasourceUrl,
  },
});
