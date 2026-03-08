import type { AdminPortalRole } from './adminPermissions.js';
import { getCollectionAsync } from './cosmosdb.js';

interface AdminRoleOverrideDoc {
  role: AdminPortalRole;
  permissions: string[];
  updatedAt: Date;
  updatedBy?: string;
}

const collection = () => getCollectionAsync<AdminRoleOverrideDoc>('admin_role_overrides');

export async function listAdminRoleOverrides(): Promise<Partial<Record<AdminPortalRole, string[]>>> {
  try {
    const docs = await (await collection()).find({}).toArray();
    return docs.reduce<Partial<Record<AdminPortalRole, string[]>>>((acc, doc) => {
      acc[doc.role] = Array.isArray(doc.permissions) ? doc.permissions : [];
      return acc;
    }, {});
  } catch (error) {
    console.error('[AdminRoleOverrides] Failed to load overrides:', error);
    return {};
  }
}

export async function upsertAdminRoleOverride(
  role: AdminPortalRole,
  permissions: string[],
  updatedBy?: string
): Promise<void> {
  const now = new Date();
  await (await collection()).updateOne(
    { role },
    {
      $set: {
        role,
        permissions,
        updatedAt: now,
        updatedBy,
      },
    },
    { upsert: true }
  );
}
