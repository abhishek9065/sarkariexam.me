import { randomUUID } from 'crypto';

import { prismaApp } from '../services/postgres/prisma.js';

interface BookmarkDoc {
  id: string;
  userId: string;
  announcementId: string;
  createdAt: Date;
}

function toBookmarkDoc(row: { id: string; userId: string; announcementId: string; createdAt: Date }): BookmarkDoc {
  return {
    id: row.id,
    userId: row.userId,
    announcementId: row.announcementId,
    createdAt: row.createdAt,
  };
}

export class BookmarkModelMongo {
  static async findByUser(userId: string): Promise<BookmarkDoc[]> {
    try {
      const rows = await prismaApp.bookmarkEntry.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
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
      const id = randomUUID();
      await prismaApp.bookmarkEntry.create({
        data: {
          id,
          userId,
          announcementId,
        },
      });
      return true;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return true;
      }
      console.error('[Postgres] add bookmark error:', error);
      return false;
    }
  }

  static async remove(userId: string, announcementId: string): Promise<boolean> {
    try {
      const deleted = await prismaApp.bookmarkEntry.deleteMany({
        where: {
          userId,
          announcementId,
        },
      });
      return deleted.count > 0;
    } catch (error) {
      console.error('[Postgres] remove bookmark error:', error);
      return false;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2002';
}

export default BookmarkModelMongo;
