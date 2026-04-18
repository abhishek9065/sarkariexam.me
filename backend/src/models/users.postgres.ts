import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { prismaApp } from '../services/postgres/prisma.js';

interface UserRow {
  id: string;
  email: string;
  username: string;
  passwordHash: string;
  passwordHistory: unknown;
  role: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin: Date | null;
  twoFactorEnabled: boolean;
  twoFactorSecret: string | null;
  twoFactorTempSecret: string | null;
  twoFactorVerifiedAt: Date | null;
  twoFactorBackupCodes: unknown;
  twoFactorBackupCodesUpdatedAt: Date | null;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  twoFactorEnabled?: boolean;
}

export interface UserAuth extends User {
  twoFactorSecret?: string;
  twoFactorTempSecret?: string;
  twoFactorVerifiedAt?: string;
  twoFactorBackupCodes?: Array<{ codeHash: string; usedAt?: string | null }>;
  twoFactorBackupCodesUpdatedAt?: string | null;
}

type PasswordHistoryEntry = { hash: string; changedAt: string };
type BackupCodeEntry = { codeHash: string; usedAt?: string | null };

function parseJsonArray<T>(value: unknown): T[] {
  if (!value) return [];
  if (Array.isArray(value)) return value as T[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? (parsed as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function toJsonValue<T>(value: T): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    lastLogin: row.lastLogin?.toISOString(),
    twoFactorEnabled: row.twoFactorEnabled,
  };
}

function toUserAuth(row: UserRow): UserAuth {
  const backupCodes = parseJsonArray<BackupCodeEntry>(row.twoFactorBackupCodes).map((entry) => ({
    codeHash: entry.codeHash,
    usedAt: entry.usedAt ?? null,
  }));

  return {
    ...toUser(row),
    twoFactorSecret: row.twoFactorSecret || undefined,
    twoFactorTempSecret: row.twoFactorTempSecret || undefined,
    twoFactorVerifiedAt: row.twoFactorVerifiedAt?.toISOString(),
    twoFactorBackupCodes: backupCodes,
    twoFactorBackupCodesUpdatedAt: row.twoFactorBackupCodesUpdatedAt?.toISOString() ?? null,
  };
}

async function findUserRowById(id: string): Promise<UserRow | null> {
  return (await prismaApp.userAccountEntry.findUnique({
    where: { id },
  })) as UserRow | null;
}

export class UserModelPostgres {
  // Keep the historical class name for route compatibility while the storage layer moves to Prisma.
  static async findByEmail(email: string): Promise<User | null> {
    try {
      const row = await prismaApp.userAccountEntry.findUnique({
        where: { email: email.toLowerCase() },
      }) as UserRow | null;
      return row ? toUser(row) : null;
    } catch (error) {
      console.error('[Postgres] findByEmail error:', error);
      return null;
    }
  }

  static async findById(id: string): Promise<User | null> {
    try {
      const row = await findUserRowById(id);
      return row ? toUser(row) : null;
    } catch (error) {
      console.error('[Postgres] findById error:', error);
      return null;
    }
  }

  static async findByIdWithSecrets(id: string): Promise<UserAuth | null> {
    try {
      const row = await findUserRowById(id);
      return row ? toUserAuth(row) : null;
    } catch (error) {
      console.error('[Postgres] findByIdWithSecrets error:', error);
      return null;
    }
  }

  static async create(data: {
    email: string;
    username: string;
    password: string;
    role?: string;
  }): Promise<User> {
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(data.password, 10);

    await prismaApp.userAccountEntry.create({
      data: {
        id,
        email: data.email.toLowerCase(),
        username: data.username,
        passwordHash,
        passwordHistory: toJsonValue([]),
        role: data.role || 'user',
        isActive: true,
        twoFactorEnabled: false,
        twoFactorBackupCodes: toJsonValue([]),
      },
    });

    const user = await this.findById(id);
    if (!user) {
      throw new Error('Failed to retrieve created user');
    }
    return user;
  }

  static async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      const row = await prismaApp.userAccountEntry.findFirst({
        where: {
          email: email.toLowerCase(),
          isActive: true,
        },
      }) as UserRow | null;
      if (!row) return null;

      const isValid = await bcrypt.compare(password, row.passwordHash);
      if (!isValid) return null;

      await prismaApp.userAccountEntry.update({
        where: { id: row.id },
        data: { lastLogin: new Date() },
      });

      const fresh = await findUserRowById(row.id);
      return fresh ? toUser(fresh) : toUser(row);
    } catch (error) {
      console.error('[Postgres] verifyPassword error:', error);
      return null;
    }
  }

  static async update(id: string, data: Partial<{
    username: string;
    email: string;
    password: string;
    role: string;
    isActive: boolean;
    twoFactorEnabled: boolean;
    twoFactorSecret: string | null;
    twoFactorTempSecret: string | null;
    twoFactorVerifiedAt: Date | null;
    twoFactorBackupCodes: Array<{ codeHash: string; usedAt?: Date | null }>;
    twoFactorBackupCodesUpdatedAt: Date | null;
  }>): Promise<User | null> {
    const existing = await findUserRowById(id);
    if (!existing) return null;

    const updateData: Record<string, unknown> = {};

    if (data.username !== undefined) updateData.username = data.username;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.role !== undefined) updateData.role = data.role;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.password !== undefined) {
      const nextHash = await bcrypt.hash(data.password, 10);
      const history = parseJsonArray<PasswordHistoryEntry>(existing.passwordHistory).slice(0, 9);
      const nextHistory: PasswordHistoryEntry[] = [
        { hash: existing.passwordHash, changedAt: new Date().toISOString() },
        ...history,
      ];
      updateData.passwordHash = nextHash;
      updateData.passwordHistory = toJsonValue(nextHistory);
    }

    if (data.twoFactorEnabled !== undefined) {
      updateData.twoFactorEnabled = data.twoFactorEnabled;
    }
    if (data.twoFactorSecret !== undefined) {
      updateData.twoFactorSecret = data.twoFactorSecret ?? null;
    }
    if (data.twoFactorTempSecret !== undefined) {
      updateData.twoFactorTempSecret = data.twoFactorTempSecret ?? null;
    }
    if (data.twoFactorVerifiedAt !== undefined) {
      updateData.twoFactorVerifiedAt = data.twoFactorVerifiedAt ?? null;
    }
    if (data.twoFactorBackupCodes !== undefined) {
      const normalized = data.twoFactorBackupCodes.map((item) => ({
        codeHash: item.codeHash,
        usedAt: item.usedAt ? item.usedAt.toISOString() : null,
      }));
      updateData.twoFactorBackupCodes = toJsonValue(normalized);
    }
    if (data.twoFactorBackupCodesUpdatedAt !== undefined) {
      updateData.twoFactorBackupCodesUpdatedAt = data.twoFactorBackupCodesUpdatedAt ?? null;
    }

    await prismaApp.userAccountEntry.update({
      where: { id },
      data: updateData,
    });

    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    try {
      const deleted = await prismaApp.userAccountEntry.deleteMany({
        where: { id },
      });
      return deleted.count > 0;
    } catch (error) {
      console.error('[Postgres] delete user error:', error);
      return false;
    }
  }

  static async findAll(filters?: {
    role?: string;
    isActive?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<User[]> {
    try {
      const { role, isActive, skip = 0, limit = 20 } = filters || {};
      const rows = await prismaApp.userAccountEntry.findMany({
        where: {
          ...(role ? { role } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }) as UserRow[];

      return rows.map((row) => toUser(row));
    } catch (error) {
      console.error('[Postgres] findAll users error:', error);
      return [];
    }
  }

  static async count(filters?: {
    role?: string;
    isActive?: boolean;
  }): Promise<number> {
    try {
      const { role, isActive } = filters || {};
      return await prismaApp.userAccountEntry.count({
        where: {
          ...(role ? { role } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
      });
    } catch (error) {
      console.error('[Postgres] count users error:', error);
      return 0;
    }
  }

  static async listActiveEmailMap(userIds: string[]): Promise<Map<string, string>> {
    try {
      const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
      if (uniqueUserIds.length === 0) return new Map();

      const rows = await prismaApp.userAccountEntry.findMany({
        where: {
          id: { in: uniqueUserIds },
          isActive: true,
        },
        select: {
          id: true,
          email: true,
        },
      }) as Array<{ id: string; email: string }>;

      return new Map(
        rows
          .filter((row) => row.email)
          .map((row) => [row.id, row.email.trim().toLowerCase()] as const),
      );
    } catch (error) {
      console.error('[Postgres] listActiveEmailMap error:', error);
      return new Map();
    }
  }

  static async verifyPasswordById(id: string, password: string): Promise<boolean> {
    try {
      const row = await findUserRowById(id);
      if (!row || !row.isActive) return false;
      return bcrypt.compare(password, row.passwordHash);
    } catch (error) {
      console.error('[Postgres] verifyPasswordById error:', error);
      return false;
    }
  }

  static async isPasswordReused(id: string, password: string, historyDepth = 5): Promise<boolean> {
    try {
      const row = await findUserRowById(id);
      if (!row) return false;

      const matchesCurrent = await bcrypt.compare(password, row.passwordHash);
      if (matchesCurrent) return true;

      const history = parseJsonArray<PasswordHistoryEntry>(row.passwordHistory)
        .slice(0, Math.max(1, historyDepth));

      for (const entry of history) {
        const reused = await bcrypt.compare(password, entry.hash);
        if (reused) return true;
      }
      return false;
    } catch (error) {
      console.error('[Postgres] isPasswordReused error:', error);
      return false;
    }
  }
}

export const UserModelMongo = UserModelPostgres;

export default UserModelPostgres;
