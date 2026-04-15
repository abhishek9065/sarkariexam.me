import { randomUUID } from 'crypto';

import { ensureBookmarksTable } from '../services/postgres/legacyTables.js';
import { prisma } from '../services/postgres/prisma.js';

interface BookmarkDoc {
  id: string;
  userId: string;
  announcementId: string;
  createdAt: Date;
}

function toBookmarkDoc(row: { id: string; user_id: string; announcement_id: string; created_at: Date }): BookmarkDoc {
  return {
    id: row.id,
    userId: row.user_id,
    announcementId: row.announcement_id,
    createdAt: row.created_at,
  };
}

export class BookmarkModelMongo {
  static async findByUser(userId: string): Promise<BookmarkDoc[]> {
    try {
      await ensureBookmarksTable();
      const rows = await prisma.$queryRaw<Array<{ id: string; user_id: string; announcement_id: string; created_at: Date }>>`
        SELECT id, user_id, announcement_id, created_at
        FROM app_bookmarks
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
      `;
      return rows.map((row) => toBookmarkDoc(row));
    } catch (error) {
      console.error('[Postgres] findByUser bookmarks error:', error);
      return [];
    }
  }

  static async findAnnouncementIdsByUser(userId: string): Promise<string[]> {
    const docs = await this.findByUser(userId);
    return docs.map((doc) => doc.announcementId);
  }

  static async add(userId: string, announcementId: string): Promise<boolean> {
    try {
      await ensureBookmarksTable();
      const id = randomUUID();
      await prisma.$executeRaw`
        INSERT INTO app_bookmarks (id, user_id, announcement_id, created_at)
        VALUES (${id}, ${userId}, ${announcementId}, NOW())
        ON CONFLICT (user_id, announcement_id) DO NOTHING
      `;
      return true;
    } catch (error) {
      console.error('[Postgres] add bookmark error:', error);
      return false;
    }
  }

  static async remove(userId: string, announcementId: string): Promise<boolean> {
    try {
      await ensureBookmarksTable();
      const deleted = await prisma.$executeRaw`
        DELETE FROM app_bookmarks
        WHERE user_id = ${userId}
          AND announcement_id = ${announcementId}
      `;
      return Number(deleted) > 0;
    } catch (error) {
      console.error('[Postgres] remove bookmark error:', error);
      return false;
    }
  }
}

export default BookmarkModelMongo;
