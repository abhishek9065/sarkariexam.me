import { ensureSiteSettingsTable } from '../services/postgres/legacyTables.js';
import { prisma } from '../services/postgres/prisma.js';

interface SiteSettingsRow {
  id: string;
  payload: unknown;
  updated_at: Date;
}

function asObject(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

export class SiteSettingsModelPostgres {
  static async getMain(): Promise<Record<string, unknown> | null> {
    await ensureSiteSettingsTable();
    const rows = await prisma.$queryRaw<SiteSettingsRow[]>`
      SELECT id, payload, updated_at
      FROM app_site_settings
      WHERE id = ${'main'}
      LIMIT 1
    `;

    const row = rows[0];
    return row ? asObject(row.payload) : null;
  }

  static async updateMain(patch: Record<string, unknown>): Promise<Record<string, unknown>> {
    await ensureSiteSettingsTable();
    const current = (await this.getMain()) || {};
    const payload = {
      ...current,
      ...patch,
    };

    await prisma.$executeRaw`
      INSERT INTO app_site_settings (
        id,
        payload,
        updated_at
      ) VALUES (
        ${'main'},
        ${JSON.stringify(payload)}::jsonb,
        NOW()
      )
      ON CONFLICT (id)
      DO UPDATE SET
        payload = EXCLUDED.payload,
        updated_at = NOW()
    `;

    return payload;
  }
}

export default SiteSettingsModelPostgres;