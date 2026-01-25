import { Router } from 'express';
import { graphql, buildSchema } from 'graphql';

import { authenticateToken, requirePermission } from '../middleware/auth.js';
import { AnnouncementModelMongo } from '../models/announcements.mongo.js';
import { getActiveUsersStats } from '../services/activeUsers.js';
import { getAnalyticsOverview } from '../services/analyticsOverview.js';
import { hasPermission } from '../services/rbac.js';

const router = Router();

const schema = buildSchema(`
  type Query {
    analyticsOverview: AnalyticsOverview!
    popularAnnouncements(limit: Int): [PopularAnnouncement!]!
    adminAnnouncements(limit: Int, offset: Int, status: String, type: String, search: String, includeInactive: Boolean): [AdminAnnouncement!]!
    activeUsers(windowMinutes: Int): ActiveUsers!
  }

  type AnalyticsOverview {
    totalAnnouncements: Int!
    totalViews: Int!
    totalEmailSubscribers: Int!
    totalPushSubscribers: Int!
    totalSearches: Int!
    totalBookmarks: Int!
    totalRegistrations: Int!
    totalSubscriptionsVerified: Int!
    totalSubscriptionsUnsubscribed: Int!
    totalListingViews: Int!
    totalCardClicks: Int!
    totalCategoryClicks: Int!
    totalFilterApplies: Int!
    totalDigestClicks: Int!
    totalDeepLinkClicks: Int!
    engagementWindowDays: Int!
    rollupLastUpdatedAt: String
    dailyRollups: [AnalyticsDailyRollup!]!
    funnel: AnalyticsFunnel!
    ctrByType: [CtrByType!]!
    digestClicks: DigestClicks
    deepLinkAttribution: DeepLinkAttribution
    typeBreakdown: [TypeBreakdown!]!
    categoryBreakdown: [CategoryBreakdown!]!
    insights: AnalyticsInsights
    lastUpdated: String!
  }

  type AnalyticsDailyRollup {
    date: String!
    count: Int!
    views: Int!
    listingViews: Int!
    cardClicks: Int!
    categoryClicks: Int!
    filterApplies: Int!
    searches: Int!
    bookmarkAdds: Int!
    registrations: Int!
  }

  type AnalyticsFunnel {
    listingViews: Int!
    cardClicks: Int!
    detailViews: Int!
    detailViewsRaw: Int
    detailViewsAdjusted: Int
    hasAnomaly: Boolean
    bookmarkAdds: Int!
    subscriptionsVerified: Int!
  }

  type CtrByType {
    type: String!
    listingViews: Int!
    cardClicks: Int!
    ctr: Int!
  }

  type DigestClicks {
    total: Int!
    variants: [DigestVariant!]!
    frequencies: [DigestFrequency!]!
    campaigns: [DigestCampaign!]!
  }

  type DigestVariant {
    variant: String!
    clicks: Int!
  }

  type DigestFrequency {
    frequency: String!
    clicks: Int!
  }

  type DigestCampaign {
    campaign: String!
    clicks: Int!
  }

  type DeepLinkAttribution {
    total: Int!
    sources: [DeepLinkSource!]!
    mediums: [DeepLinkMedium!]!
    campaigns: [DeepLinkCampaign!]!
  }

  type DeepLinkSource {
    source: String!
    clicks: Int!
  }

  type DeepLinkMedium {
    medium: String!
    clicks: Int!
  }

  type DeepLinkCampaign {
    campaign: String!
    clicks: Int!
  }

  type TypeBreakdown {
    type: String!
    count: Int!
    share: Int
  }

  type CategoryBreakdown {
    category: String!
    count: Int!
    share: Int
  }

  type AnalyticsInsights {
    viewTrendPct: Float!
    viewTrendDirection: String!
    clickThroughRate: Int!
    funnelDropRate: Int!
    listingCoverage: Int!
    topType: TypeBreakdown
    topCategory: CategoryBreakdown
    anomaly: Boolean!
    rollupAgeMinutes: Int
  }

  type PopularAnnouncement {
    id: String!
    title: String!
    type: String!
    category: String
    viewCount: Int!
  }

  type AdminAnnouncement {
    id: String!
    title: String!
    type: String!
    category: String
    organization: String
    status: String
    viewCount: Int
    isActive: Boolean
    updatedAt: String
  }

  type ActiveUsers {
    windowMinutes: Int!
    since: String!
    total: Int!
    authenticated: Int!
    anonymous: Int!
    admins: Int!
  }
`);

const ensurePermission = (role: string | undefined, permission: Parameters<typeof hasPermission>[1]) => {
    if (!hasPermission(role as any, permission as any)) {
        throw new Error('Forbidden');
    }
};

const root = {
    analyticsOverview: async (_args: unknown, context: { user?: { role?: string } }) => {
        ensurePermission(context.user?.role, 'analytics:read');
        const { data } = await getAnalyticsOverview();
        return data;
    },
    popularAnnouncements: async (
        { limit = 10 }: { limit?: number },
        context: { user?: { role?: string } }
    ) => {
        ensurePermission(context.user?.role, 'analytics:read');
        const announcements = await AnnouncementModelMongo.getTrending({ limit: Math.min(50, limit ?? 10) });
        return announcements.map((announcement) => ({
            id: announcement.id,
            title: announcement.title,
            type: announcement.type,
            category: announcement.category || '',
            viewCount: announcement.viewCount || 0,
        }));
    },
    adminAnnouncements: async (
        {
            limit = 50,
            offset = 0,
            status,
            type,
            search,
            includeInactive,
        }: {
            limit?: number;
            offset?: number;
            status?: string;
            type?: string;
            search?: string;
            includeInactive?: boolean;
        },
        context: { user?: { role?: string } }
    ) => {
        ensurePermission(context.user?.role, 'announcements:read');
        const announcements = await AnnouncementModelMongo.findAllAdmin({
            limit: Math.min(500, Math.max(1, limit)),
            offset: Math.max(0, offset),
            status: status as any,
            type: type as any,
            search,
            includeInactive,
        });
        return announcements.map((announcement) => ({
            id: announcement.id,
            title: announcement.title,
            type: announcement.type,
            category: announcement.category,
            organization: announcement.organization,
            status: announcement.status,
            viewCount: announcement.viewCount,
            isActive: announcement.isActive,
            updatedAt: announcement.updatedAt,
        }));
    },
    activeUsers: async (
        { windowMinutes = 15 }: { windowMinutes?: number },
        context: { user?: { role?: string } }
    ) => {
        ensurePermission(context.user?.role, 'admin:read');
        return getActiveUsersStats(windowMinutes);
    },
};

router.post('/', authenticateToken, requirePermission('admin:read'), async (req, res) => {
    const { query, variables, operationName } = req.body ?? {};

    if (!query || typeof query !== 'string') {
        return res.status(400).json({ errors: [{ message: 'GraphQL query is required.' }] });
    }

    try {
        const result = await graphql({
            schema,
            source: query,
            rootValue: root,
            contextValue: { user: req.user },
            variableValues: variables,
            operationName,
        });

        if (result.errors) {
            return res.status(400).json(result);
        }

        return res.json(result);
    } catch (error) {
        console.error('[GraphQL] Error:', error);
        return res.status(500).json({ errors: [{ message: 'GraphQL execution failed.' }] });
    }
});

export default router;
