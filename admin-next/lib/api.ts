import type {
  Announcement,
  AnalyticsOverview,
  DashboardData,
  PaginatedResponse,
  SiteSettings,
  User,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

let csrfTokenCache: string | null = null;

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (!match) return null;
  try { return decodeURIComponent(match[1]); } catch { return match[1]; }
}

export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(typeof body === 'object' && body && 'error' in (body as Record<string, unknown>)
      ? String((body as Record<string, unknown>).error)
      : `Request failed (${status})`);
    this.status = status;
    this.body = body;
  }
}

async function parseBody(res: Response): Promise<unknown> {
  try { return await res.json(); } catch { return null; }
}

async function ensureCsrfToken(forceRefresh = false): Promise<string> {
  if (!forceRefresh) {
    const cookieToken = readCookie(CSRF_COOKIE_NAME);
    if (cookieToken) { csrfTokenCache = cookieToken; return cookieToken; }
    if (csrfTokenCache) return csrfTokenCache;
  }
  const res = await fetch(`${API_BASE}/auth/csrf`, { method: 'GET', credentials: 'include' });
  if (!res.ok) { const body = await parseBody(res); throw new ApiError(res.status, body); }
  const body = await parseBody(res) as { data?: { csrfToken?: string } } | null;
  const token = body?.data?.csrfToken || readCookie(CSRF_COOKIE_NAME);
  if (!token) throw new Error('Unable to initialize CSRF token');
  csrfTokenCache = token;
  return token;
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { ...(options.headers as Record<string, string> || {}) };
  if (options.body) headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
  if (!res.ok) { const body = await parseBody(res); throw new ApiError(res.status, body); }
  if (res.status === 204) return undefined as T;
  return parseBody(res) as Promise<T>;
}

async function apiFetchWithCsrf<T>(path: string, options: RequestInit = {}): Promise<T> {
  const doRequest = async (force = false): Promise<T> => {
    const csrfToken = await ensureCsrfToken(force);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
      [CSRF_HEADER_NAME]: csrfToken,
    };
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers, credentials: 'include' });
    if (!res.ok) { const body = await parseBody(res); throw new ApiError(res.status, body); }
    if (res.status === 204) return undefined as T;
    return parseBody(res) as Promise<T>;
  };
  try { return await doRequest(false); }
  catch (err) {
    if (err instanceof ApiError && err.status === 403 &&
        (err.body as Record<string, unknown> | null)?.error === 'csrf_invalid') {
      return doRequest(true);
    }
    throw err;
  }
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== '');
  if (entries.length === 0) return '';
  return '?' + entries.map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
}

// ─── Auth ───
export function login(email: string, password: string) {
  return apiFetchWithCsrf<{ data: { user: User } }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function getMe() {
  return apiFetch<{ data: { user: User } }>('/auth/me');
}

export function logout() {
  return apiFetchWithCsrf<{ message: string }>('/auth/logout', { method: 'POST' });
}

export function clearCsrfCache() {
  csrfTokenCache = null;
}

// ─── Dashboard ───
export function getDashboard() {
  return apiFetch<{ data: DashboardData }>('/admin/dashboard');
}

// ─── Announcements ───
export interface AnnouncementFilters {
  type?: string;
  status?: string;
  search?: string;
  category?: string;
  organization?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export function getAdminAnnouncements(filters: AnnouncementFilters = {}) {
  return apiFetch<PaginatedResponse<Announcement>>(`/admin/announcements${qs(filters as Record<string, string | number | undefined>)}`);
}

export function getAdminAnnouncement(id: string) {
  return apiFetch<{ data: Announcement }>(`/admin/announcements/${id}`);
}

export function createAnnouncement(data: Partial<Announcement>) {
  return apiFetchWithCsrf<{ data: Announcement }>('/admin/announcements', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateAnnouncement(id: string, data: Partial<Announcement>) {
  return apiFetchWithCsrf<{ data: Announcement }>(`/admin/announcements/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function changeAnnouncementStatus(id: string, status: string, note?: string) {
  return apiFetchWithCsrf<{ data: Announcement }>(`/admin/announcements/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, note }),
  });
}

export function deleteAnnouncement(id: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/announcements/${id}`, {
    method: 'DELETE',
  });
}

export function bulkChangeStatus(ids: string[], status: string, note?: string) {
  return apiFetchWithCsrf<{ data: { updated: number; errors: string[]; total: number } }>(
    '/admin/announcements/bulk-status',
    { method: 'POST', body: JSON.stringify({ ids, status, note }) }
  );
}

// ─── Users ───
export interface UserFilters {
  role?: string;
  isActive?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
}

export function getAdminUsers(filters: UserFilters = {}) {
  return apiFetch<PaginatedResponse<User>>(`/admin/users${qs(filters as Record<string, string | number | boolean | undefined>)}`);
}

export const getUsers = getAdminUsers;

export function getAdminUser(id: string) {
  return apiFetch<{ data: User }>(`/admin/users/${id}`);
}

export function updateUser(id: string, data: Partial<User>) {
  return apiFetchWithCsrf<{ data: User }>(`/admin/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export function deleteUser(id: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/users/${id}`, {
    method: 'DELETE',
  });
}

// ─── Analytics ───
export function getAnalyticsOverview(days = 30) {
  return apiFetch<{ data: AnalyticsOverview; cached: boolean }>(`/admin/analytics/overview${qs({ days })}`);
}

export function getContentAnalytics(limit = 50, type?: string) {
  return apiFetch<{ data: Array<{ id: string; title: string; slug: string; type: string; category: string; organization: string; viewCount: number; status: string; postedAt: string }> }>(
    `/admin/analytics/content${qs({ limit, type })}`
  );
}

export function getAnalyticsContent(days = 30) {
  return getContentAnalytics(50);
}

// ─── Subscribers ───
export function getSubscribers(filters: { search?: string; limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: any[]; total: number; count: number }>(`/admin/subscribers${qs(filters as Record<string, string | number | undefined>)}`);
}

export function getSubscriberStats() {
  return apiFetch<{ data: { total: number; verified: number; unverified: number; byFrequency: Array<{ _id: string; count: number }> } }>('/admin/subscribers/stats');
}

export function deleteSubscriber(id: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/subscribers/${id}`, { method: 'DELETE' });
}

// ─── Push Subscribers ───
export function getPushSubscribers(filters: { limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: any[]; total: number; count: number }>(`/admin/push-subscribers${qs(filters as Record<string, string | number | undefined>)}`);
}

export function sendPushNotification(data: { title: string; body: string; url?: string }) {
  return apiFetchWithCsrf<{ data: { sent: number; failed: number; total: number; message?: string } }>('/admin/push/send', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Community ───
export function getCommunityForums(filters: { limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: any[]; total: number; count: number }>(`/admin/community/forums${qs(filters as Record<string, string | number | undefined>)}`);
}

export function deleteCommunityForum(id: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/community/forums/${id}`, { method: 'DELETE' });
}

export function getCommunityQA(filters: { limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: any[]; total: number; count: number }>(`/admin/community/qa${qs(filters as Record<string, string | number | undefined>)}`);
}

export function deleteCommunityQA(id: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/community/qa/${id}`, { method: 'DELETE' });
}

export function answerCommunityQA(id: string, answer: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/community/qa/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ answer }),
  });
}

export function getCommunityGroups(filters: { limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: any[]; total: number; count: number }>(`/admin/community/groups${qs(filters as Record<string, string | number | undefined>)}`);
}

export function deleteCommunityGroup(id: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/community/groups/${id}`, { method: 'DELETE' });
}

export function getCommunityFlags(filters: { status?: string; limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: any[]; total: number; count: number }>(`/admin/community/flags${qs(filters as Record<string, string | number | undefined>)}`);
}

export function updateCommunityFlag(id: string, status: 'reviewed' | 'resolved') {
  return apiFetchWithCsrf<{ message: string }>(`/admin/community/flags/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

// ─── Error Reports ───
export function getErrorReports(filters: { status?: string; limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: any[]; total: number; count: number }>(`/admin/error-reports${qs(filters as Record<string, string | number | undefined>)}`);
}

export function updateErrorReport(id: string, data: { status: 'triaged' | 'resolved'; reviewNote?: string }) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/error-reports/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ─── Audit Log ───
export function getAuditLog(filters: { limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: any[]; total: number; count: number }>(`/admin/audit-log${qs(filters as Record<string, string | number | undefined>)}`);
}

// ─── Settings ───
export function getSettings() {
  return apiFetch<{ data: SiteSettings }>('/admin/settings');
}

export function updateSettings(data: Partial<SiteSettings>) {
  return apiFetchWithCsrf<{ data: SiteSettings }>('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}
