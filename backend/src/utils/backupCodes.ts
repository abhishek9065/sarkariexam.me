import crypto from 'crypto';

import { config } from '../config.js';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const DEFAULT_COUNT = 10;
const SEGMENT_LENGTH = 4;
const TOTAL_LENGTH = 8;

const getRandomChar = () => CODE_ALPHABET[crypto.randomInt(0, CODE_ALPHABET.length)];

export const normalizeBackupCode = (value: string): string => {
  return value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
};

export const generateBackupCode = (): string => {
  const chars = Array.from({ length: TOTAL_LENGTH }, getRandomChar).join('');
  return `${chars.slice(0, SEGMENT_LENGTH)}-${chars.slice(SEGMENT_LENGTH)}`;
};

export const generateBackupCodes = (count = DEFAULT_COUNT): string[] => {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateBackupCode());
  }
  return Array.from(codes);
};

export const hashBackupCode = (code: string): string => {
  const normalized = normalizeBackupCode(code);
  return crypto
    .createHmac('sha256', config.adminBackupCodeSalt)
    .update(normalized)
    .digest('hex');
};
