import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';

import { ensureProfileTables } from '../services/postgres/legacyTables.js';
import { prisma } from '../services/postgres/prisma.js';
import type { ContentType, TrackerStatus } from '../types.js';

export interface UserProfileRecord {
  id: string;
  userId: string;
  preferredCategories: string[];
  preferredQualifications: string[];
  preferredLocations: string[];
  preferredOrganizations: string[];
  ageGroup: string | null;
  educationLevel: string | null;
  experienceYears: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  notificationFrequency: 'instant' | 'daily' | 'weekly';
  alertWindowDays: number;
  alertMaxItems: number;
  profileComplete: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SavedSearchRecord {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters?: {
    type?: ContentType;
    category?: string;
    organization?: string;
    location?: string;
    qualification?: string;
    salaryMin?: number;
    salaryMax?: number;
  };
  notificationsEnabled: boolean;
  frequency: 'instant' | 'daily' | 'weekly';
  lastNotifiedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserNotificationRecord {
  id: string;
  userId: string;
  announcementId: string;
  title: string;
  type: ContentType;
  slug?: string;
  organization?: string;
  source: string;
  createdAt: Date;
  readAt?: Date | null;
}

export interface TrackedApplicationRecord {
  id: string;
  userId: string;
  announcementId?: string;
  slug: string;
  type: ContentType;
  title: string;
  organization?: string;
  deadline?: Date | null;
  status: TrackerStatus;
  notes?: string;
  reminderAt?: Date | null;
  trackedAt: Date;
  updatedAt: Date;
}

type ProfileRow = {
  id: string;
  user_id: string;
  preferred_categories: string[];
  preferred_qualifications: string[];
  preferred_locations: string[];
  preferred_organizations: string[];
  age_group: string | null;
  education_level: string | null;
  experience_years: number;
  email_notifications: boolean;
  push_notifications: boolean;
  notification_frequency: string;
  alert_window_days: number;
  alert_max_items: number;
  profile_complete: boolean;
  onboarding_completed: boolean;
  created_at: Date;
  updated_at: Date;
};

type SavedSearchRow = {
  id: string;
  user_id: string;
  name: string;
  query: string;
  filters: unknown;
  notifications_enabled: boolean;
  frequency: string;
  last_notified_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type NotificationRow = {
  id: string;
  user_id: string;
  announcement_id: string;
  title: string;
  type: string;
  slug: string | null;
  organization: string | null;
  source: string;
  created_at: Date;
  read_at: Date | null;
};

type TrackedRow = {
  id: string;
  user_id: string;
  announcement_id: string | null;
  slug: string;
  type: string;
  title: string;
  organization: string | null;
  deadline: Date | null;
  status: string;
  notes: string | null;
  reminder_at: Date | null;
  tracked_at: Date;
  updated_at: Date;
};

function asFrequency(value: string): 'instant' | 'daily' | 'weekly' {
  return value === 'instant' || value === 'weekly' ? value : 'daily';
}

function asContentType(value: string): ContentType {
  if (value === 'result' || value === 'admit-card' || value === 'syllabus' || value === 'answer-key' || value === 'admission') {
    return value;
  }
  return 'job';
}

function asTrackerStatus(value: string): TrackerStatus {
  if (value === 'applied' || value === 'admit-card' || value === 'exam' || value === 'result') return value;
  return 'saved';
}

function parseFilters(value: unknown): SavedSearchRecord['filters'] {
  if (!value) return undefined;
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as SavedSearchRecord['filters'];
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object') return parsed as SavedSearchRecord['filters'];
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function toProfileRecord(row: ProfileRow): UserProfileRecord {
  return {
    id: row.id,
    userId: row.user_id,
    preferredCategories: row.preferred_categories || [],
    preferredQualifications: row.preferred_qualifications || [],
    preferredLocations: row.preferred_locations || [],
    preferredOrganizations: row.preferred_organizations || [],
    ageGroup: row.age_group,
    educationLevel: row.education_level,
    experienceYears: row.experience_years,
    emailNotifications: row.email_notifications,
    pushNotifications: row.push_notifications,
    notificationFrequency: asFrequency(row.notification_frequency),
    alertWindowDays: row.alert_window_days,
    alertMaxItems: row.alert_max_items,
    profileComplete: row.profile_complete,
    onboardingCompleted: row.onboarding_completed,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSavedSearchRecord(row: SavedSearchRow): SavedSearchRecord {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    query: row.query,
    filters: parseFilters(row.filters),
    notificationsEnabled: row.notifications_enabled,
    frequency: asFrequency(row.frequency),
    lastNotifiedAt: row.last_notified_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toNotificationRecord(row: NotificationRow): UserNotificationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    announcementId: row.announcement_id,
    title: row.title,
    type: asContentType(row.type),
    slug: row.slug || undefined,
    organization: row.organization || undefined,
    source: row.source,
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

function toTrackedRecord(row: TrackedRow): TrackedApplicationRecord {
  return {
    id: row.id,
    userId: row.user_id,
    announcementId: row.announcement_id || undefined,
    slug: row.slug,
    type: asContentType(row.type),
    title: row.title,
    organization: row.organization || undefined,
    deadline: row.deadline,
    status: asTrackerStatus(row.status),
    notes: row.notes || undefined,
    reminderAt: row.reminder_at,
    trackedAt: row.tracked_at,
    updatedAt: row.updated_at,
  };
}

async function findProfileByUserId(userId: string): Promise<UserProfileRecord | null> {
  await ensureProfileTables();
  const rows = await prisma.$queryRaw<ProfileRow[]>`
    SELECT *
    FROM app_user_profiles
    WHERE user_id = ${userId}
    LIMIT 1
  `;
  return rows[0] ? toProfileRecord(rows[0]) : null;
}

export class ProfileModelPostgres {
  static async getOrCreateProfile(userId: string): Promise<UserProfileRecord> {
    const existing = await findProfileByUserId(userId);
    if (existing) return existing;

    await ensureProfileTables();
    const id = randomUUID();
    const now = new Date();

    await prisma.$executeRaw`
      INSERT INTO app_user_profiles (
        id,
        user_id,
        preferred_categories,
        preferred_qualifications,
        preferred_locations,
        preferred_organizations,
        age_group,
        education_level,
        experience_years,
        email_notifications,
        push_notifications,
        notification_frequency,
        alert_window_days,
        alert_max_items,
        profile_complete,
        onboarding_completed,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${userId},
        ${[]},
        ${[]},
        ${[]},
        ${[]},
        ${null},
        ${null},
        ${0},
        ${true},
        ${false},
        ${'daily'},
        ${7},
        ${6},
        ${false},
        ${false},
        ${now},
        ${now}
      )
      ON CONFLICT (user_id) DO NOTHING
    `;

    const created = await findProfileByUserId(userId);
    if (!created) {
      throw new Error('Failed to initialize user profile');
    }
    return created;
  }

  static async updateProfile(userId: string, patch: Partial<Omit<UserProfileRecord, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    await this.getOrCreateProfile(userId);

    const setClauses: Prisma.Sql[] = [Prisma.sql`updated_at = NOW()`];

    if (patch.preferredCategories !== undefined) setClauses.push(Prisma.sql`preferred_categories = ${patch.preferredCategories}`);
    if (patch.preferredQualifications !== undefined) setClauses.push(Prisma.sql`preferred_qualifications = ${patch.preferredQualifications}`);
    if (patch.preferredLocations !== undefined) setClauses.push(Prisma.sql`preferred_locations = ${patch.preferredLocations}`);
    if (patch.preferredOrganizations !== undefined) setClauses.push(Prisma.sql`preferred_organizations = ${patch.preferredOrganizations}`);
    if (patch.ageGroup !== undefined) setClauses.push(Prisma.sql`age_group = ${patch.ageGroup}`);
    if (patch.educationLevel !== undefined) setClauses.push(Prisma.sql`education_level = ${patch.educationLevel}`);
    if (patch.experienceYears !== undefined) setClauses.push(Prisma.sql`experience_years = ${patch.experienceYears}`);
    if (patch.emailNotifications !== undefined) setClauses.push(Prisma.sql`email_notifications = ${patch.emailNotifications}`);
    if (patch.pushNotifications !== undefined) setClauses.push(Prisma.sql`push_notifications = ${patch.pushNotifications}`);
    if (patch.notificationFrequency !== undefined) setClauses.push(Prisma.sql`notification_frequency = ${patch.notificationFrequency}`);
    if (patch.alertWindowDays !== undefined) setClauses.push(Prisma.sql`alert_window_days = ${patch.alertWindowDays}`);
    if (patch.alertMaxItems !== undefined) setClauses.push(Prisma.sql`alert_max_items = ${patch.alertMaxItems}`);
    if (patch.profileComplete !== undefined) setClauses.push(Prisma.sql`profile_complete = ${patch.profileComplete}`);
    if (patch.onboardingCompleted !== undefined) setClauses.push(Prisma.sql`onboarding_completed = ${patch.onboardingCompleted}`);

    await prisma.$executeRaw(
      Prisma.sql`UPDATE app_user_profiles SET ${Prisma.join(setClauses, ', ')} WHERE user_id = ${userId}`,
    );
  }

  static async listSavedSearches(userId: string): Promise<SavedSearchRecord[]> {
    await ensureProfileTables();
    const rows = await prisma.$queryRaw<SavedSearchRow[]>`
      SELECT *
      FROM app_saved_searches
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;
    return rows.map((row) => toSavedSearchRecord(row));
  }

  static async createSavedSearch(userId: string, input: Omit<SavedSearchRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SavedSearchRecord> {
    await ensureProfileTables();
    const id = randomUUID();
    const now = new Date();
    const filtersJson = input.filters ? JSON.stringify(input.filters) : null;

    await prisma.$executeRaw`
      INSERT INTO app_saved_searches (
        id,
        user_id,
        name,
        query,
        filters,
        notifications_enabled,
        frequency,
        last_notified_at,
        created_at,
        updated_at
      ) VALUES (
        ${id},
        ${userId},
        ${input.name},
        ${input.query || ''},
        CAST(${filtersJson} AS jsonb),
        ${input.notificationsEnabled},
        ${input.frequency},
        ${input.lastNotifiedAt ?? null},
        ${now},
        ${now}
      )
    `;

    const rows = await prisma.$queryRaw<SavedSearchRow[]>`
      SELECT *
      FROM app_saved_searches
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!rows[0]) throw new Error('Failed to create saved search');
    return toSavedSearchRecord(rows[0]);
  }

  static async updateSavedSearch(userId: string, id: string, patch: Partial<Omit<SavedSearchRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<SavedSearchRecord | null> {
    await ensureProfileTables();

    const setClauses: Prisma.Sql[] = [Prisma.sql`updated_at = NOW()`];
    if (patch.name !== undefined) setClauses.push(Prisma.sql`name = ${patch.name}`);
    if (patch.query !== undefined) setClauses.push(Prisma.sql`query = ${patch.query}`);
    if (patch.filters !== undefined) {
      setClauses.push(
        patch.filters
          ? Prisma.sql`filters = CAST(${JSON.stringify(patch.filters)} AS jsonb)`
          : Prisma.sql`filters = NULL`,
      );
    }
    if (patch.notificationsEnabled !== undefined) setClauses.push(Prisma.sql`notifications_enabled = ${patch.notificationsEnabled}`);
    if (patch.frequency !== undefined) setClauses.push(Prisma.sql`frequency = ${patch.frequency}`);
    if (patch.lastNotifiedAt !== undefined) setClauses.push(Prisma.sql`last_notified_at = ${patch.lastNotifiedAt ?? null}`);

    const updated = await prisma.$executeRaw(
      Prisma.sql`UPDATE app_saved_searches SET ${Prisma.join(setClauses, ', ')} WHERE id = ${id} AND user_id = ${userId}`,
    );
    if (Number(updated) === 0) return null;

    const rows = await prisma.$queryRaw<SavedSearchRow[]>`
      SELECT *
      FROM app_saved_searches
      WHERE id = ${id}
        AND user_id = ${userId}
      LIMIT 1
    `;

    return rows[0] ? toSavedSearchRecord(rows[0]) : null;
  }

  static async deleteSavedSearch(userId: string, id: string): Promise<boolean> {
    await ensureProfileTables();
    const deleted = await prisma.$executeRaw`
      DELETE FROM app_saved_searches
      WHERE id = ${id}
        AND user_id = ${userId}
    `;
    return Number(deleted) > 0;
  }

  static async listNotifications(userId: string, limit = 12): Promise<UserNotificationRecord[]> {
    await ensureProfileTables();
    const rows = await prisma.$queryRaw<NotificationRow[]>(
      Prisma.sql`
        SELECT *
        FROM app_user_notifications
        WHERE user_id = ${userId}
        ORDER BY created_at DESC
        LIMIT ${limit}
      `,
    );
    return rows.map((row) => toNotificationRecord(row));
  }

  static async countUnreadNotifications(userId: string): Promise<number> {
    await ensureProfileTables();
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM app_user_notifications
      WHERE user_id = ${userId}
        AND read_at IS NULL
    `;
    return Number(rows[0]?.count || 0);
  }

  static async markAllNotificationsRead(userId: string): Promise<void> {
    await ensureProfileTables();
    await prisma.$executeRaw`
      UPDATE app_user_notifications
      SET read_at = NOW()
      WHERE user_id = ${userId}
        AND read_at IS NULL
    `;
  }

  static async markNotificationsRead(userId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await ensureProfileTables();
    await prisma.$executeRaw(
      Prisma.sql`
        UPDATE app_user_notifications
        SET read_at = NOW()
        WHERE user_id = ${userId}
          AND id IN (${Prisma.join(ids)})
      `,
    );
  }

  static async upsertNotifications(userId: string, items: Array<{
    announcementId: string;
    title: string;
    type: ContentType;
    slug?: string;
    organization?: string;
  }>, source: string): Promise<void> {
    if (!items.length) return;
    await ensureProfileTables();

    for (const item of items) {
      await prisma.$executeRaw`
        INSERT INTO app_user_notifications (
          id,
          user_id,
          announcement_id,
          title,
          type,
          slug,
          organization,
          source,
          created_at,
          read_at
        ) VALUES (
          ${randomUUID()},
          ${userId},
          ${item.announcementId},
          ${item.title},
          ${item.type},
          ${item.slug || null},
          ${item.organization || null},
          ${source},
          NOW(),
          NULL
        )
        ON CONFLICT (user_id, announcement_id, source) DO NOTHING
      `;
    }
  }

  static async listTrackedApplications(userId: string): Promise<TrackedApplicationRecord[]> {
    await ensureProfileTables();
    const rows = await prisma.$queryRaw<TrackedRow[]>`
      SELECT *
      FROM app_tracked_applications
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `;
    return rows.map((row) => toTrackedRecord(row));
  }

  static async upsertTrackedApplicationBySlug(userId: string, payload: {
    announcementId?: string;
    slug: string;
    type: ContentType;
    title: string;
    organization?: string;
    deadline?: Date | null;
    status: TrackerStatus;
    notes?: string;
    reminderAt?: Date | null;
    trackedAt?: Date;
    updatedAt?: Date;
  }): Promise<TrackedApplicationRecord | null> {
    await ensureProfileTables();

    const trackedAt = payload.trackedAt || new Date();
    const updatedAt = payload.updatedAt || new Date();

    await prisma.$executeRaw`
      INSERT INTO app_tracked_applications (
        id,
        user_id,
        announcement_id,
        slug,
        type,
        title,
        organization,
        deadline,
        status,
        notes,
        reminder_at,
        tracked_at,
        updated_at
      ) VALUES (
        ${randomUUID()},
        ${userId},
        ${payload.announcementId || null},
        ${payload.slug},
        ${payload.type},
        ${payload.title},
        ${payload.organization || null},
        ${payload.deadline ?? null},
        ${payload.status},
        ${payload.notes || null},
        ${payload.reminderAt ?? null},
        ${trackedAt},
        ${updatedAt}
      )
      ON CONFLICT (user_id, slug)
      DO UPDATE SET
        announcement_id = EXCLUDED.announcement_id,
        type = EXCLUDED.type,
        title = EXCLUDED.title,
        organization = EXCLUDED.organization,
        deadline = EXCLUDED.deadline,
        status = EXCLUDED.status,
        notes = EXCLUDED.notes,
        reminder_at = EXCLUDED.reminder_at,
        updated_at = EXCLUDED.updated_at
    `;

    const rows = await prisma.$queryRaw<TrackedRow[]>`
      SELECT *
      FROM app_tracked_applications
      WHERE user_id = ${userId}
        AND slug = ${payload.slug}
      LIMIT 1
    `;

    return rows[0] ? toTrackedRecord(rows[0]) : null;
  }

  static async updateTrackedApplicationById(userId: string, id: string, patch: Partial<{
    status: TrackerStatus;
    notes?: string;
    reminderAt?: Date | null;
    updatedAt?: Date;
  }>): Promise<TrackedApplicationRecord | null> {
    await ensureProfileTables();

    const setClauses: Prisma.Sql[] = [Prisma.sql`updated_at = ${patch.updatedAt || new Date()}`];
    if (patch.status !== undefined) setClauses.push(Prisma.sql`status = ${patch.status}`);
    if (patch.notes !== undefined) setClauses.push(Prisma.sql`notes = ${patch.notes || null}`);
    if (patch.reminderAt !== undefined) setClauses.push(Prisma.sql`reminder_at = ${patch.reminderAt ?? null}`);

    const updated = await prisma.$executeRaw(
      Prisma.sql`UPDATE app_tracked_applications SET ${Prisma.join(setClauses, ', ')} WHERE id = ${id} AND user_id = ${userId}`,
    );

    if (Number(updated) === 0) return null;

    const rows = await prisma.$queryRaw<TrackedRow[]>`
      SELECT *
      FROM app_tracked_applications
      WHERE id = ${id}
        AND user_id = ${userId}
      LIMIT 1
    `;

    return rows[0] ? toTrackedRecord(rows[0]) : null;
  }

  static async deleteTrackedApplicationById(userId: string, id: string): Promise<boolean> {
    await ensureProfileTables();
    const deleted = await prisma.$executeRaw`
      DELETE FROM app_tracked_applications
      WHERE id = ${id}
        AND user_id = ${userId}
    `;
    return Number(deleted) > 0;
  }

  static async importTrackedApplications(userId: string, items: Array<{
    announcementId?: string;
    slug: string;
    type: ContentType;
    title: string;
    organization?: string;
    deadline?: Date | null;
    status: TrackerStatus;
    notes?: string;
    reminderAt?: Date | null;
    trackedAt?: Date;
    updatedAt?: Date;
  }>): Promise<number> {
    let imported = 0;
    for (const item of items) {
      const upserted = await this.upsertTrackedApplicationBySlug(userId, item);
      if (upserted) imported += 1;
    }
    return imported;
  }
}

export default ProfileModelPostgres;
