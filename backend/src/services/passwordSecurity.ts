import crypto from 'crypto';

import { config } from '../config.js';

const COMMON_BREACHED_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'qwerty',
  'qwerty123',
  '12345678',
  '123456789',
  '1234567890',
  'welcome',
  'letmein',
  'admin',
  'admin123',
  'iloveyou',
  'abc123',
  'changeme',
]);

const containsRepetitivePattern = (password: string): boolean => {
  if (/(.)\1{4,}/i.test(password)) return true;
  if (/012345|123456|234567|345678|456789|567890/.test(password)) return true;
  return false;
};

const sha1 = (input: string) => crypto.createHash('sha1').update(input).digest('hex').toUpperCase();

const fetchPwnedCount = async (password: string): Promise<number | null> => {
  if (!config.passwordBreachCheckEnabled) return null;
  const hash = sha1(password);
  const prefix = hash.slice(0, 5);
  const suffix = hash.slice(5);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.passwordBreachCheckTimeoutMs);
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'Add-Padding': 'true',
        'User-Agent': 'SarkariExams-Password-Security',
      },
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const text = await response.text();
    const match = text
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line.toUpperCase().startsWith(`${suffix}:`));
    if (!match) return 0;
    const count = Number(match.split(':')[1]);
    return Number.isFinite(count) ? count : 0;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
};

export type PasswordSecurityResult = {
  breached: boolean;
  reason?: 'common' | 'pattern' | 'hibp';
  occurrences?: number;
};

export const checkPasswordSecurity = async (password: string): Promise<PasswordSecurityResult> => {
  const normalized = password.trim().toLowerCase();
  if (COMMON_BREACHED_PASSWORDS.has(normalized)) {
    return { breached: true, reason: 'common' };
  }
  if (containsRepetitivePattern(password)) {
    return { breached: true, reason: 'pattern' };
  }

  const pwnedCount = await fetchPwnedCount(password);
  if (typeof pwnedCount === 'number' && pwnedCount > 0) {
    return { breached: true, reason: 'hibp', occurrences: pwnedCount };
  }

  return { breached: false };
};
