import { prismaApp } from './postgres/prisma.js';

export async function getUserFeedback(limit = 50) {
  try {
    return await prismaApp.userFeedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function getCommentsPendingReview(limit = 50) {
  try {
    return await prismaApp.communityComment.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  } catch {
    return [];
  }
}

export async function moderateComment(id: string, action: 'approve' | 'reject') {
  try {
    await prismaApp.communityComment.update({
      where: { id },
      data: {
        status: action === 'approve' ? 'approved' : 'rejected',
        moderatedAt: new Date(),
      },
    });
    return true;
  } catch {
    return false;
  }
}

export async function getEngagementMetrics(days = 30) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [feedbackCount, commentsCount, bookmarksCount] = await Promise.all([
      prismaApp.userFeedback.count({ where: { createdAt: { gte: since } } }),
      prismaApp.communityComment.count({ where: { createdAt: { gte: since } } }),
      prismaApp.bookmarkEntry.count({ where: { createdAt: { gte: since } } }),
    ]);

    return { feedbackCount, commentsCount, bookmarksCount };
  } catch {
    return { feedbackCount: 0, commentsCount: 0, bookmarksCount: 0 };
  }
}

export const engagementService = {
  getUserFeedback,
  getCommentsPendingReview,
  moderateComment,
  getEngagementMetrics,
};

export default engagementService;
