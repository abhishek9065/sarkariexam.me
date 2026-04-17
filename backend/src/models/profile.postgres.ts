import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';

import { ensureProfileTables } from '../services/postgres/legacyTables.js';
import { prisma, prismaApp } from '../services/postgres/prisma.js';
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
  notificationFrequency: string;
  alertWindowDays: number;
  alertMaxItems: number;
  profileComplete: boolean;
  onboardingCompleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type SavedSearchRow = {
  id: string;
  userId: string;
  name: string;
  query: string;
  filters: unknown;
  notificationsEnabled: boolean;
  frequency: string;
  lastNotifiedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type NotificationRow = {
  id: string;
  userId: string;
  announcementId: string;
  title: string;
  type: string;
  slug: string | null;
  organization: string | null;
  source: string;
  createdAt: Date;
  readAt: Date | null;
};

type TrackedRow = {
  id: string;
  userId: string;
  announcementId: string | null;
  slug: string;
  type: string;
  title: string;
  organization: string | null;
  deadline: Date | null;
  status: string;
  notes: string | null;
  reminderAt: Date | null;
  trackedAt: Date;
  updatedAt: Date;
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
    userId: row.userId,
    preferredCategories: row.preferredCategories || [],
    preferredQualifications: row.preferredQualifications || [],
    preferredLocations: row.preferredLocations || [],
    preferredOrganizations: row.preferredOrganizations || [],
    ageGroup: row.ageGroup,
    educationLevel: row.educationLevel,
    experienceYears: row.experienceYears,
    emailNotifications: row.emailNotifications,
    pushNotifications: row.pushNotifications,
    notificationFrequency: asFrequency(row.notificationFrequency),
    alertWindowDays: row.alertWindowDays,
    alertMaxItems: row.alertMaxItems,
    profileComplete: row.profileComplete,
    onboardingCompleted: row.onboardingCompleted,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toSavedSearchRecord(row: SavedSearchRow): SavedSearchRecord {
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    query: row.query,
    filters: parseFilters(row.filters),
    notificationsEnabled: row.notificationsEnabled,
    frequency: asFrequency(row.frequency),
    lastNotifiedAt: row.lastNotifiedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function toNotificationRecord(row: NotificationRow): UserNotificationRecord {
  return {
    id: row.id,
    userId: row.userId,
    announcementId: row.announcementId,
    title: row.title,
    type: asContentType(row.type),
    slug: row.slug || undefined,
    organization: row.organization || undefined,
    source: row.source,
    createdAt: row.createdAt,
    readAt: row.readAt,
  };
}

function toTrackedRecord(row: TrackedRow): TrackedApplicationRecord {
  return {
    id: row.id,
    userId: row.userId,
    announcementId: row.announcementId || undefined,
    slug: row.slug,
    type: asContentType(row.type),
    title: row.title,
    organization: row.organization || undefined,
    deadline: row.deadline,
    status: asTrackerStatus(row.status),
    notes: row.notes || undefined,
    reminderAt: row.reminderAt,
    trackedAt: row.trackedAt,
    updatedAt: row.updatedAt,
  };
}

async function findProfileByUserId(userId: string): Promise<UserProfileRecord | null> {
  const row = await prismaApp.userProfileEntry.findUnique({
    where: { userId },
  });
  return row ? toProfileRecord(row) : null;
}

export class ProfileModelPostgres {
  static async getOrCreateProfile(userId: string): Promise<UserProfileRecord> {
    const existing = await findProfileByUserId(userId);
    if (existing) return existing;

    const id = randomUUID();
    try {
      await prismaApp.userProfileEntry.create({
        data: {
          id,
          userId,
          preferredCategories: [],
          preferredQualifications: [],
          preferredLocations: [],
          preferredOrganizations: [],
          ageGroup: null,
          educationLevel: null,
          experienceYears: 0,
          emailNotifications: true,
          pushNotifications: false,
          notificationFrequency: 'daily',
          alertWindowDays: 7,
          alertMaxItems: 6,
          profileComplete: false,
          onboardingCompleted: false,
        },
      });
    } catch (error) {
      if (!isUniqueConstraintError(error)) {
        throw error;
      }
    }

    const created = await findProfileByUserId(userId);
    if (!created) {
      throw new Error('Failed to initialize user profile');
    }
    return created;
  }

  static async updateProfile(userId: string, patch: Partial<Omit<UserProfileRecord, 'id' | 'userId' | 'createdAt'>>): Promise<void> {
    await this.getOrCreateProfile(userId);

    const data: Record<string, unknown> = {};
    if (patch.preferredCategories !== undefined) data.preferredCategories = patch.preferredCategories;
    if (patch.preferredQualifications !== undefined) data.preferredQualifications = patch.preferredQualifications;
    if (patch.preferredLocations !== undefined) data.preferredLocations = patch.preferredLocations;
    if (patch.preferredOrganizations !== undefined) data.preferredOrganizations = patch.preferredOrganizations;
    if (patch.ageGroup !== undefined) data.ageGroup = patch.ageGroup;
    if (patch.educationLevel !== undefined) data.educationLevel = patch.educationLevel;
    if (patch.experienceYears !== undefined) data.experienceYears = patch.experienceYears;
    if (patch.emailNotifications !== undefined) data.emailNotifications = patch.emailNotifications;
    if (patch.pushNotifications !== undefined) data.pushNotifications = patch.pushNotifications;
    if (patch.notificationFrequency !== undefined) data.notificationFrequency = patch.notificationFrequency;
    if (patch.alertWindowDays !== undefined) data.alertWindowDays = patch.alertWindowDays;
    if (patch.alertMaxItems !== undefined) data.alertMaxItems = patch.alertMaxItems;
    if (patch.profileComplete !== undefined) data.profileComplete = patch.profileComplete;
    if (patch.onboardingCompleted !== undefined) data.onboardingCompleted = patch.onboardingCompleted;

    await prismaApp.userProfileEntry.updateMany({
      where: { userId },
      data,
    });
  }

  static async listSavedSearches(userId: string): Promise<SavedSearchRecord[]> {
    const rows = await prismaApp.savedSearchEntry.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
    return rows.map((row) => toSavedSearchRecord(row));
  }

  static async createSavedSearch(userId: string, input: Omit<SavedSearchRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<SavedSearchRecord> {
    const id = randomUUID();
    const row = await prismaApp.savedSearchEntry.create({
      data: {
        id,
        userId,
        name: input.name,
        query: input.query || '',
        filters: input.filters ?? null,
        notificationsEnabled: input.notificationsEnabled,
        frequency: input.frequency,
        lastNotifiedAt: input.lastNotifiedAt ?? null,
      },
    });

    return toSavedSearchRecord(row);
  }

  static async updateSavedSearch(userId: string, id: string, patch: Partial<Omit<SavedSearchRecord, 'id' | 'userId' | 'createdAt' | 'updatedAt'>>): Promise<SavedSearchRecord | null> {
    const data: Record<string, unknown> = {};
    if (patch.name !== undefined) data.name = patch.name;
    if (patch.query !== undefined) data.query = patch.query;
    if (patch.filters !== undefined) data.filters = patch.filters ?? null;
    if (patch.notificationsEnabled !== undefined) data.notificationsEnabled = patch.notificationsEnabled;
    if (patch.frequency !== undefined) data.frequency = patch.frequency;
    if (patch.lastNotifiedAt !== undefined) data.lastNotifiedAt = patch.lastNotifiedAt ?? null;

    const updated = await prismaApp.savedSearchEntry.updateMany({
      where: { id, userId },
      data,
    });
    if (updated.count === 0) return null;

    const row = await prismaApp.savedSearchEntry.findFirst({
      where: { id, userId },
    });

    return row ? toSavedSearchRecord(row) : null;
  }

  static async deleteSavedSearch(userId: string, id: string): Promise<boolean> {
    const deleted = await prismaApp.savedSearchEntry.deleteMany({
      where: { id, userId },
    });
    return deleted.count > 0;
  }

  static async listNotifications(userId: string, limit = 12): Promise<UserNotificationRecord[]> {
    const rows = await prismaApp.userNotificationEntry.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.map((row) => toNotificationRecord(row));
  }

  static async countUnreadNotifications(userId: string): Promise<number> {
    return prismaApp.userNotificationEntry.count({
      where: {
        userId,
        readAt: null,
      },
    });
  }

  static async markAllNotificationsRead(userId: string): Promise<void> {
    await prismaApp.userNotificationEntry.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  static async markNotificationsRead(userId: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await prismaApp.userNotificationEntry.updateMany({
      where: {
        userId,
        id: { in: ids },
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  static async upsertNotifications(userId: string, items: Array<{
    announcementId: string;
    title: string;
    type: ContentType;
    slug?: string;
    organization?: string;
  }>, source: string): Promise<void> {
    if (!items.length) return;

    for (const item of items) {
      try {
        await prismaApp.userNotificationEntry.create({
          data: {
            id: randomUUID(),
            userId,
            announcementId: item.announcementId,
            title: item.title,
            type: item.type,
            slug: item.slug || null,
            organization: item.organization || null,
            source,
            readAt: null,
          },
        });
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }
      }
    }
  }

  static async listTrackedApplications(userId: string): Promise<TrackedApplicationRecord[]> {
    const rows = await prismaApp.trackedApplicationEntry.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
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
    const trackedAt = payload.trackedAt || new Date();
    const updatedAt = payload.updatedAt || new Date();
    const row = await prismaApp.trackedApplicationEntry.upsert({
      where: {
        userId_slug: {
          userId,
          slug: payload.slug,
        },
      },
      create: {
        id: randomUUID(),
        userId,
        announcementId: payload.announcementId || null,
        slug: payload.slug,
        type: payload.type,
        title: payload.title,
        organization: payload.organization || null,
        deadline: payload.deadline ?? null,
        status: payload.status,
        notes: payload.notes || null,
        reminderAt: payload.reminderAt ?? null,
        trackedAt,
        updatedAt,
      },
      update: {
        announcementId: payload.announcementId || null,
        type: payload.type,
        title: payload.title,
        organization: payload.organization || null,
        deadline: payload.deadline ?? null,
        status: payload.status,
        notes: payload.notes || null,
        reminderAt: payload.reminderAt ?? null,
        updatedAt,
      },
    });

    return row ? toTrackedRecord(row) : null;
  }

  static async updateTrackedApplicationById(userId: string, id: string, patch: Partial<{
    status: TrackerStatus;
    notes?: string;
    reminderAt?: Date | null;
    updatedAt?: Date;
  }>): Promise<TrackedApplicationRecord | null> {
    const data: Record<string, unknown> = {
      updatedAt: patch.updatedAt || new Date(),
    };
    if (patch.status !== undefined) data.status = patch.status;
    if (patch.notes !== undefined) data.notes = patch.notes || null;
    if (patch.reminderAt !== undefined) data.reminderAt = patch.reminderAt ?? null;

    const updated = await prismaApp.trackedApplicationEntry.updateMany({
      where: { id, userId },
      data,
    });

    if (updated.count === 0) return null;

    const row = await prismaApp.trackedApplicationEntry.findFirst({
      where: { id, userId },
    });

    return row ? toTrackedRecord(row) : null;
  }

  static async deleteTrackedApplicationById(userId: string, id: string): Promise<boolean> {
    const deleted = await prismaApp.trackedApplicationEntry.deleteMany({
      where: { id, userId },
    });
    return deleted.count > 0;
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

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && error.code === 'P2002';
}

export default ProfileModelPostgres;
