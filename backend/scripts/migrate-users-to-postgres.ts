import '../src/config.js';

import { prismaApp } from '../services/postgres/prisma.js';
import { closeConnection, connectToDatabase, getCollection } from '../src/services/cosmosdb.js';

async function migrateUsers() {
  console.log('[Migration] Starting Users migration...');
  await connectToDatabase();

  const usersCol = getCollection<any>('users');
  const users = await usersCol.find({}).toArray();

  console.log(`[Migration] Found ${users.length} users in CosmosDB.`);

  let migrated = 0;
  let errors = 0;

  for (const user of users) {
    try {
      const id = user._id ? user._id.toString() : user.id;
      if (!id) continue;

      // Prepare fields with fallback defaults
      const email = user.email ? user.email.toLowerCase() : `user_${id}@example.com`;
      const username = user.username || user.name || 'Unknown User';
      const passwordHash = user.passwordHash || user.password || '';
      const role = user.role || 'user';
      const isActive = user.isActive !== undefined ? user.isActive : true;

      await prismaApp.userAccountEntry.upsert({
        where: { id },
        update: {
          email,
          username,
          passwordHash,
          role,
          isActive,
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          twoFactorEnabled: user.twoFactorEnabled || false,
          twoFactorSecret: user.twoFactorSecret || null,
          twoFactorTempSecret: user.twoFactorTempSecret || null,
          twoFactorVerifiedAt: user.twoFactorVerifiedAt ? new Date(user.twoFactorVerifiedAt) : null,
          twoFactorBackupCodesUpdatedAt: user.twoFactorBackupCodesUpdatedAt ? new Date(user.twoFactorBackupCodesUpdatedAt) : null,
        },
        create: {
          id,
          email,
          username,
          passwordHash,
          role,
          isActive,
          createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
          lastLogin: user.lastLogin ? new Date(user.lastLogin) : null,
          twoFactorEnabled: user.twoFactorEnabled || false,
          twoFactorSecret: user.twoFactorSecret || null,
          twoFactorTempSecret: user.twoFactorTempSecret || null,
          twoFactorVerifiedAt: user.twoFactorVerifiedAt ? new Date(user.twoFactorVerifiedAt) : null,
          twoFactorBackupCodesUpdatedAt: user.twoFactorBackupCodesUpdatedAt ? new Date(user.twoFactorBackupCodesUpdatedAt) : null,
        }
      });
      migrated++;
    } catch (e) {
      console.error(`[Migration] Failed to migrate user ${user._id}:`, e);
      errors++;
    }
  }

  console.log(`[Migration] Users migration completed. Migrated: ${migrated}, Errors: ${errors}`);
  
  await closeConnection();
}

migrateUsers().catch(console.error);
