import { prismaApp } from '../services/postgres/prisma.js';

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export class SiteSettingsModelPostgres {
  static async getMain(): Promise<Record<string, unknown> | null> {
    const row = await prismaApp.siteSettingRecord.findUnique({
      where: { id: 'main' },
      select: { payload: true },
    });

    return row ? asObject(row.payload) : null;
  }

  static async updateMain(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    const current = (await this.getMain()) || {};
    const payload = {
      ...current,
      ...patch,
    };

    await prismaApp.siteSettingRecord.upsert({
      where: { id: 'main' },
      create: {
        id: 'main',
        payload,
      },
      update: {
        payload,
      },
    });

    return payload;
  }
}

export default SiteSettingsModelPostgres;
