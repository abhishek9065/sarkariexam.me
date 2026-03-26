import { getCollection } from './cosmosdb.js';

export async function getUserFeedback(limit = 50) {
  try {
    const col = getCollection('user_feedback');
    return await col.find({}).sort({ createdAt: -1 }).limit(limit).toArray();
  } catch {
    return [];
  }
}

export async function getCommentsPendingReview(limit = 50) {
  try {
    const col = getCollection('community_comments');
    return await col.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(limit).toArray();
  } catch {
    return [];
  }
}

export async function moderateComment(id: string, action: 'approve' | 'reject') {
  try {
    const col = getCollection('community_comments');
    const { ObjectId } = await import('mongodb');
    await col.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status: action === 'approve' ? 'approved' : 'rejected', moderatedAt: new Date() } }
    );
    return true;
  } catch {
    return false;
  }
}

export async function getEngagementMetrics(days = 30) {
  try {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const feedbackCol = getCollection('user_feedback');
    const commentsCol = getCollection('community_comments');
    const bookmarksCol = getCollection('bookmarks');

    const [feedbackCount, commentsCount, bookmarksCount] = await Promise.all([
      feedbackCol.countDocuments({ createdAt: { $gte: since } }),
      commentsCol.countDocuments({ createdAt: { $gte: since } }),
      bookmarksCol.countDocuments({ createdAt: { $gte: since } }),
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
