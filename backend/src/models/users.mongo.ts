import { randomUUID } from 'crypto';

import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

import { ensureUsersTable } from '../services/postgres/legacyTables.js';
import { prisma } from '../services/postgres/prisma.js';

interface UserRow {
  id: string;
  email: string;
  username: string;
  password_hash: string;
  password_history: unknown;
  role: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  last_login: Date | null;
  two_factor_enabled: boolean;
  two_factor_secret: string | null;
  two_factor_temp_secret: string | null;
  two_factor_verified_at: Date | null;
  two_factor_backup_codes: unknown;
  two_factor_backup_codes_updated_at: Date | null;
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

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at.toISOString(),
    lastLogin: row.last_login?.toISOString(),
    twoFactorEnabled: row.two_factor_enabled,
  };
}

function toUserAuth(row: UserRow): UserAuth {
  const backupCodes = parseJsonArray<BackupCodeEntry>(row.two_factor_backup_codes).map((entry) => ({
    codeHash: entry.codeHash,
    usedAt: entry.usedAt ?? null,
  }));

  return {
    ...toUser(row),
    twoFactorSecret: row.two_factor_secret || undefined,
    twoFactorTempSecret: row.two_factor_temp_secret || undefined,
    twoFactorVerifiedAt: row.two_factor_verified_at?.toISOString(),
    twoFactorBackupCodes: backupCodes,
    twoFactorBackupCodesUpdatedAt: row.two_factor_backup_codes_updated_at?.toISOString() ?? null,
  };
}

async function findUserRowById(id: string): Promise<UserRow | null> {
  await ensureUsersTable();
  const rows = await prisma.$queryRaw<UserRow[]>`
    SELECT *
    FROM app_users
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export class UserModelMongo {
  static async findByEmail(email: string): Promise<User | null> {
    try {
      await ensureUsersTable();
      const rows = await prisma.$queryRaw<UserRow[]>`
        SELECT *
        FROM app_users
        WHERE email = ${email.toLowerCase()}
        LIMIT 1
      `;
      return rows[0] ? toUser(rows[0]) : null;
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
    await ensureUsersTable();

    const id = randomUUID();
    const now = new Date();
    const passwordHash = await bcrypt.hash(data.password, 10);

    await prisma.$executeRaw`
      INSERT INTO app_users (
        id,
        email,
        username,
        password_hash,
        password_history,
        role,
        is_active,
        created_at,
        updated_at,
        two_factor_enabled,
        two_factor_backup_codes
      )
      VALUES (
        ${id},
        ${data.email.toLowerCase()},
        ${data.username},
        ${passwordHash},
        CAST(${JSON.stringify([])} AS jsonb),
        ${data.role || 'user'},
        ${true},
        ${now},
        ${now},
        ${false},
        CAST(${JSON.stringify([])} AS jsonb)
      )
    `;

    const user = await this.findById(id);
    if (!user) {
      throw new Error('Failed to retrieve created user');
    }
    return user;
  }

  static async verifyPassword(email: string, password: string): Promise<User | null> {
    try {
      await ensureUsersTable();
      const rows = await prisma.$queryRaw<UserRow[]>`
        SELECT *
        FROM app_users
        WHERE email = ${email.toLowerCase()}
          AND is_active = TRUE
        LIMIT 1
      `;
      const row = rows[0];
      if (!row) return null;

      const isValid = await bcrypt.compare(password, row.password_hash);
      if (!isValid) return null;

      await prisma.$executeRaw`
        UPDATE app_users
        SET last_login = NOW(),
            updated_at = NOW()
        WHERE id = ${row.id}
      `;

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
    await ensureUsersTable();

    const existing = await findUserRowById(id);
    if (!existing) return null;

    const setClauses: Prisma.Sql[] = [Prisma.sql`updated_at = NOW()`];

    if (data.username !== undefined) setClauses.push(Prisma.sql`username = ${data.username}`);
    if (data.email !== undefined) setClauses.push(Prisma.sql`email = ${data.email.toLowerCase()}`);
    if (data.role !== undefined) setClauses.push(Prisma.sql`role = ${data.role}`);
    if (data.isActive !== undefined) setClauses.push(Prisma.sql`is_active = ${data.isActive}`);

    if (data.password !== undefined) {
      const nextHash = await bcrypt.hash(data.password, 10);
      const history = parseJsonArray<PasswordHistoryEntry>(existing.password_history).slice(0, 9);
      const nextHistory: PasswordHistoryEntry[] = [
        { hash: existing.password_hash, changedAt: new Date().toISOString() },
        ...history,
      ];
      setClauses.push(Prisma.sql`password_hash = ${nextHash}`);
      setClauses.push(Prisma.sql`password_history = CAST(${JSON.stringify(nextHistory)} AS jsonb)`);
    }

    if (data.twoFactorEnabled !== undefined) {
      setClauses.push(Prisma.sql`two_factor_enabled = ${data.twoFactorEnabled}`);
    }
    if (data.twoFactorSecret !== undefined) {
      setClauses.push(Prisma.sql`two_factor_secret = ${data.twoFactorSecret ?? null}`);
    }
    if (data.twoFactorTempSecret !== undefined) {
      setClauses.push(Prisma.sql`two_factor_temp_secret = ${data.twoFactorTempSecret ?? null}`);
    }
    if (data.twoFactorVerifiedAt !== undefined) {
      setClauses.push(Prisma.sql`two_factor_verified_at = ${data.twoFactorVerifiedAt ?? null}`);
    }
    if (data.twoFactorBackupCodes !== undefined) {
      const normalized = data.twoFactorBackupCodes.map((item) => ({
        codeHash: item.codeHash,
        usedAt: item.usedAt ? item.usedAt.toISOString() : null,
      }));
      setClauses.push(Prisma.sql`two_factor_backup_codes = CAST(${JSON.stringify(normalized)} AS jsonb)`);
    }
    if (data.twoFactorBackupCodesUpdatedAt !== undefined) {
      setClauses.push(Prisma.sql`two_factor_backup_codes_updated_at = ${data.twoFactorBackupCodesUpdatedAt ?? null}`);
    }

    await prisma.$executeRaw(
      Prisma.sql`UPDATE app_users SET ${Prisma.join(setClauses, ', ')} WHERE id = ${id}`,
    );

    return this.findById(id);
  }

  static async delete(id: string): Promise<boolean> {
    try {
      await ensureUsersTable();
      const deleted = await prisma.$executeRaw`
        DELETE FROM app_users
        WHERE id = ${id}
      `;
      return Number(deleted) > 0;
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
      await ensureUsersTable();
      const { role, isActive, skip = 0, limit = 20 } = filters || {};

      const whereParts: Prisma.Sql[] = [];
      if (role) whereParts.push(Prisma.sql`role = ${role}`);
      if (isActive !== undefined) whereParts.push(Prisma.sql`is_active = ${isActive}`);

      const whereClause = whereParts.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(whereParts, ' AND ')}`
        : Prisma.empty;

      const rows = await prisma.$queryRaw<UserRow[]>(
        Prisma.sql`
          SELECT *
          FROM app_users
          ${whereClause}
          ORDER BY created_at DESC
          OFFSET ${skip}
          LIMIT ${limit}
        `,
      );

      return rows.map((row) => toUser(row));
    } catch (error) {
      console.error('[Postgres] findAll users error:', error);
      return [];
    }
  }

  static async verifyPasswordById(id: string, password: string): Promise<boolean> {
    try {
      const row = await findUserRowById(id);
      if (!row || !row.is_active) return false;
      return bcrypt.compare(password, row.password_hash);
    } catch (error) {
      console.error('[Postgres] verifyPasswordById error:', error);
      return false;
    }
  }

  static async isPasswordReused(id: string, password: string, historyDepth = 5): Promise<boolean> {
    try {
      const row = await findUserRowById(id);
      if (!row) return false;

      const matchesCurrent = await bcrypt.compare(password, row.password_hash);
      if (matchesCurrent) return true;

      const history = parseJsonArray<PasswordHistoryEntry>(row.password_history).slice(0, Math.max(1, historyDepth));
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

export default UserModelMongo;
