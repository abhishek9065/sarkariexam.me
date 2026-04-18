import '../src/config.js';

import { prismaApp } from '../services/postgres/prisma.js';
import { closeConnection, connectToDatabase, getCollection } from '../src/services/cosmosdb.js';

async function migrateBookmarks() {
  console.log('[Migration] Starting Bookmarks migration...');
  await connectToDatabase();

  const bookmarksCol = getCollection<any>('bookmarks');
  const bookmarks = await bookmarksCol.find({}).toArray();

  console.log(`[Migration] Found ${bookmarks.length} bookmarks in CosmosDB.`);

  let migrated = 0;
  let errors = 0;

  for (const bookmark of bookmarks) {
    try {
      const id = bookmark._id ? bookmark._id.toString() : bookmark.id;
      if (!id) continue;

      const userId = bookmark.userId?.toString();
      const announcementId = bookmark.announcementId?.toString();

      if (!userId || !announcementId) continue;

      await prismaApp.bookmarkEntry.upsert({
        where: { id },
        update: {
          userId,
          announcementId,
        },
        create: {
          id,
          userId,
          announcementId,
          createdAt: bookmark.createdAt ? new Date(bookmark.createdAt) : new Date(),
        }
      });
      migrated++;
    } catch (e) {
      console.error(`[Migration] Failed to migrate bookmark ${bookmark._id}:`, e);
      errors++;
    }
  }

  console.log(`[Migration] Bookmarks migration completed. Migrated: ${migrated}, Errors: ${errors}`);
  
  await closeConnection();
}

migrateBookmarks().catch(console.error);
