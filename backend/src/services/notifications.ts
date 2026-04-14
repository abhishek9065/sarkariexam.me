import { z } from 'zod';

const notificationCampaignSchema = z.object({
  title: z.string().min(5).max(200),
  body: z.string().min(10).max(1000),
  url: z.string().url().optional(),
  segment: z.object({
    type: z.enum(['all', 'state', 'category', 'organization', 'qualification', 'type', 'language']),
    value: z.string(),
  }),
  scheduledAt: z.string().datetime().optional(),
  abTest: z.object({
    enabled: z.boolean(),
    variantA: z.object({ title: z.string(), body: z.string() }).optional(),
    variantB: z.object({ title: z.string(), body: z.string() }).optional(),
  }).optional(),
});

interface NotificationCampaign {
  id: string;
  title: string;
  body: string;
  url?: string;
  segment: { type: string; value: string };
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
  sentCount: number;
  failedCount: number;
  openCount: number;
  clickCount: number;
  scheduledAt?: Date;
  sentAt?: Date;
  createdBy: string;
  createdAt: Date;
  abTest?: {
    enabled: boolean;
    variantA?: { title: string; body: string };
    variantB?: { title: string; body: string };
  };
}

/**
 * Create a new notification campaign
 */
export async function createCampaign(
  data: unknown,
  userId: string
): Promise<{ success: boolean; campaignId?: string; error?: string }> {
  const parse = notificationCampaignSchema.safeParse(data);
  if (!parse.success) {
    return { success: false, error: parse.error.message };
  }

  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('notification_campaigns');

    const campaign: NotificationCampaign = {
      id: crypto.randomUUID(),
      title: parse.data.title,
      body: parse.data.body,
      url: parse.data.url,
      segment: {
        type: parse.data.segment.type,
        value: parse.data.segment.value
      },
      status: parse.data.scheduledAt ? 'scheduled' : 'draft',
      sentCount: 0,
      failedCount: 0,
      openCount: 0,
      clickCount: 0,
      scheduledAt: parse.data.scheduledAt ? new Date(parse.data.scheduledAt) : undefined,
      createdBy: userId,
      createdAt: new Date(),
      abTest: parse.data.abTest ? {
        enabled: parse.data.abTest.enabled,
        variantA: parse.data.abTest.variantA as any,
        variantB: parse.data.abTest.variantB as any,
      } : undefined,
    };

    await col.insertOne(campaign as any);
    return { success: true, campaignId: campaign.id };
  } catch (error) {
    console.error('[NotificationService] Error creating campaign:', error);
    return { success: false, error: 'Failed to create campaign' };
  }
}

/**
 * Get notification campaigns
 */
export async function getCampaigns(limit = 50): Promise<NotificationCampaign[]> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('notification_campaigns');
    
    const results = await col
      .find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
      
    return results as unknown as NotificationCampaign[];
  } catch (error) {
    console.error('[NotificationService] Error fetching campaigns:', error);
    return [];
  }
}

/**
 * Get user segments for targeting
 */
export async function getUserSegments(): Promise<{
  states: string[];
  categories: string[];
  languages: string[];
  totalUsers: number;
}> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('alert_subscriptions');

    // Aggregate states from user profiles
    const statePipeline = [
      { $match: { stateNames: { $exists: true, $ne: [] } } },
      { $unwind: '$stateNames' },
      { $group: { _id: '$stateNames', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ];
    
    // Aggregate preferred categories
    const categoryPipeline = [
      { $match: { categoryNames: { $exists: true, $ne: [] } } },
      { $unwind: '$categoryNames' },
      { $group: { _id: '$categoryNames', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ];

    const [states, categories] = await Promise.all([
      col.aggregate(statePipeline).toArray(),
      col.aggregate(categoryPipeline).toArray(),
    ]);

    const totalUsers = await col.countDocuments({ isActive: true });

    return {
      states: states.map((s: any) => s._id).filter(Boolean),
      categories: categories.map((c: any) => c._id).filter(Boolean),
      languages: ['Hindi', 'English', 'Tamil', 'Telugu', 'Marathi', 'Bengali'],
      totalUsers,
    };
  } catch (error) {
    console.error('[NotificationService] Error fetching segments:', error);
    return { states: [], categories: [], languages: [], totalUsers: 0 };
  }
}

/**
 * Get targeted user count for a segment
 */
export async function getSegmentUserCount(
  segmentType: string,
  segmentValue: string
): Promise<number> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('alert_subscriptions');

    const query: Record<string, unknown> = { isActive: true };
    
    switch (segmentType) {
      case 'state':
        query.stateSlugs = segmentValue;
        break;
      case 'category':
        query.categorySlugs = { $in: [segmentValue] };
        break;
      case 'organization':
        query.organizationSlugs = { $in: [segmentValue] };
        break;
      case 'qualification':
        query.qualificationSlugs = { $in: [segmentValue] };
        break;
      case 'type':
        query.postTypes = { $in: [segmentValue] };
        break;
      case 'language':
        query.language = segmentValue;
        break;
      case 'all':
      default:
        break;
    }

    return await col.countDocuments(query);
  } catch (error) {
    console.error('[NotificationService] Error counting segment users:', error);
    return 0;
  }
}

/**
 * Send notification campaign
 */
export async function sendCampaign(campaignId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const campaignsCol = getCollection('notification_campaigns');
    
    const doc = await campaignsCol.findOne({ id: campaignId });
    if (!doc) {
      return { success: false, error: 'Campaign not found' };
    }
    const campaign = doc as unknown as NotificationCampaign;

    if (campaign.status === 'sending' || campaign.status === 'sent') {
      return { success: false, error: 'Campaign already sent' };
    }

    // Update status to sending
    await campaignsCol.updateOne({ id: campaignId }, { $set: { status: 'sending' } });

    // Get target users
    const subscriptionsCol = getCollection('alert_subscriptions');
    const pushSubsCol = getCollection('push_subscriptions');

    const userQuery: Record<string, unknown> = { isActive: true, verified: true };
    
    switch (campaign.segment.type) {
      case 'state':
        userQuery.stateSlugs = campaign.segment.value;
        break;
      case 'category':
        userQuery.categorySlugs = { $in: [campaign.segment.value] };
        break;
      case 'organization':
        userQuery.organizationSlugs = { $in: [campaign.segment.value] };
        break;
      case 'qualification':
        userQuery.qualificationSlugs = { $in: [campaign.segment.value] };
        break;
      case 'type':
        userQuery.postTypes = { $in: [campaign.segment.value] };
        break;
      case 'language':
        userQuery.language = campaign.segment.value;
        break;
    }

    // Send to email subscribers
    const emailUsers = await subscriptionsCol.find(userQuery).toArray();
    
    // Send to push subscribers
    const pushUsers = await pushSubsCol.find({}).toArray();

    // Simulate sending (in production, this would use actual email/push services)
    const sentCount = emailUsers.length + pushUsers.length;
    
    // Update campaign status
    await campaignsCol.updateOne(
      { id: campaignId },
      { 
        $set: { 
          status: 'sent',
          sentAt: new Date(),
          sentCount,
        }
      }
    );

    console.log(`[NotificationService] Campaign ${campaignId} sent to ${sentCount} users`);
    return { success: true };
  } catch (error) {
    console.error('[NotificationService] Error sending campaign:', error);
    
    // Update status to failed
    const { getCollection } = await import('./cosmosdb.js');
    const campaignsCol = getCollection('notification_campaigns');
    await campaignsCol.updateOne({ id: campaignId }, { $set: { status: 'failed' } });
    
    return { success: false, error: 'Failed to send campaign' };
  }
}

/**
 * Schedule a campaign for later
 */
export async function scheduleCampaign(
  campaignId: string,
  scheduledAt: Date
): Promise<boolean> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('notification_campaigns');
    
    await col.updateOne(
      { id: campaignId },
      { $set: { scheduledAt, status: 'scheduled' } }
    );
    
    return true;
  } catch (error) {
    console.error('[NotificationService] Error scheduling campaign:', error);
    return false;
  }
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<boolean> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('notification_campaigns');
    
    const result = await col.deleteOne({ id: campaignId });
    return result.deletedCount > 0;
  } catch (error) {
    console.error('[NotificationService] Error deleting campaign:', error);
    return false;
  }
}

/**
 * Process scheduled campaigns (run via cron job)
 */
export async function processScheduledCampaigns(): Promise<number> {
  try {
    const { getCollection } = await import('./cosmosdb.js');
    const col = getCollection('notification_campaigns');
    const now = new Date();

    const results = await col
      .find({
        status: 'scheduled',
        scheduledAt: { $lte: now },
      })
      .toArray();
      
    const scheduled = results as unknown as NotificationCampaign[];

    for (const campaign of scheduled) {
      await sendCampaign(campaign.id);
    }

    return scheduled.length;
  } catch (error) {
    console.error('[NotificationService] Error processing scheduled campaigns:', error);
    return 0;
  }
}

export const notificationService = {
  createCampaign,
  getCampaigns,
  getUserSegments,
  getSegmentUserCount,
  sendCampaign,
  scheduleCampaign,
  deleteCampaign,
  processScheduledCampaigns,
};

export default notificationService;
