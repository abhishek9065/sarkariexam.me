import crypto from 'crypto';
import { NextFunction, Request, Response } from 'express';

import { config } from '../config.js';

export const CSRF_COOKIE_NAME = 'csrf_token';
const AUTH_COOKIE_NAME = 'auth_token';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const CSRF_HEADER_CANDIDATES = ['x-csrf-token', 'x-xsrf-token'];
type CsrfExemptRule = {
  method: string;
  path: string;
};

type CsrfProtectionOptions = {
  cookieNames?: string[];
  exempt?: CsrfExemptRule[];
};

const normalizePath = (value: string): string => {
  const normalized = value.trim();
  if (!normalized || normalized === '/') return '/';
  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
};

const matchesExemptRule = (req: Request, rule: CsrfExemptRule): boolean => {
  const methodMatches = req.method.toUpperCase() === rule.method.toUpperCase();
  if (!methodMatches) return false;
  return normalizePath(req.path) === normalizePath(rule.path);
};

const readHeaderToken = (req: Request): string | undefined => {
  for (const headerName of CSRF_HEADER_CANDIDATES) {
    const value = req.get(headerName);
    if (value) return value;
  }
  return undefined;
};

const getAuthCookieNames = () => [AUTH_COOKIE_NAME, config.adminAuthCookieName];

export const generateCsrfToken = (): string => crypto.randomBytes(32).toString('base64url');

export const setCsrfCookie = (res: Response, token: string = generateCsrfToken()): string => {
  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
  });
  return token;
};

export const ensureCsrfCookie = (req: Request, res: Response): string => {
  const existing = (req as any).cookies?.[CSRF_COOKIE_NAME];
  if (existing) return existing;
  return setCsrfCookie(res);
};

export const clearCsrfCookie = (res: Response): void => {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: false,
    secure: config.isProduction,
    sameSite: 'strict',
    path: '/',
  });
};

export const csrfProtection = (options?: CsrfProtectionOptions) => {
  const cookieNames = options?.cookieNames?.length ? options.cookieNames : getAuthCookieNames();
  const exemptRules = options?.exempt ?? [];

  return (req: Request, res: Response, next: NextFunction): void => {
    if (!MUTATING_METHODS.has(req.method.toUpperCase())) {
      next();
      return;
    }

    if (exemptRules.some((rule) => matchesExemptRule(req, rule))) {
      next();
      return;
    }

    const authHeader = req.get('authorization');
    if (authHeader && /^Bearer\s+/i.test(authHeader)) {
      next();
      return;
    }

    const cookies = (req as any).cookies ?? {};
    const hasProtectedCookie = cookieNames.some((cookieName) => Boolean(cookies[cookieName]));
    if (!hasProtectedCookie) {
      next();
      return;
    }

    const cookieToken = cookies[CSRF_COOKIE_NAME];
    const headerToken = readHeaderToken(req);
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      res.status(403).json({
        error: 'csrf_invalid',
        message: 'CSRF validation failed.',
      });
      return;
    }

    next();
  };
};
