import type {
  AlertImpactQueueItem,
  AlertMatchPreview,
  AlertPreferenceCoverage,
  AlertSubscriber,
  AlertSubscriberStats,
  Announcement,
  AnalyticsOverview,
  CmsDashboardData,
  CmsPost,
  CmsTaxonomy,
  DashboardData,
  EditorialBulkTransitionResult,
  PaginatedResponse,
  SiteSettings,
  User,
  WorkflowViolation,
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

export function getAnalyticsContent() {
  return getContentAnalytics(50);
}

// ─── Subscribers ───
export function getSubscribers(filters: { search?: string; status?: 'all' | 'active' | 'inactive'; frequency?: 'all' | 'instant' | 'daily' | 'weekly'; limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: AlertSubscriber[]; total: number; count: number }>(`/admin/subscribers${qs(filters as Record<string, string | number | undefined>)}`);
}

export function getSubscriberStats() {
  return apiFetch<{ data: AlertSubscriberStats }>('/admin/subscribers/stats');
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

// ─── AI Assistant ───
export function generateMetaWithAI(data: { title: string; content: string; organization?: string }) {
  return apiFetchWithCsrf<{ data: { metaTitle: string; metaDescription: string } }>('/admin/ai/generate-meta', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function suggestTagsWithAI(data: { title: string; content: string; organization?: string; existingTags?: string[] }) {
  return apiFetchWithCsrf<{ data: Array<{ tag: string; confidence: number }> }>('/admin/ai/suggest-tags', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function generateSocialSummaryWithAI(data: { title: string; content: string; deadline?: string }) {
  return apiFetchWithCsrf<{ data: { summary: string } }>('/admin/ai/social-summary', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ─── Live Analytics ───
export function getLiveMetrics() {
  return apiFetch<{ data: {
    activeUsers: number;
    pageViews: number;
    trendingSearches: Array<{ query: string; count: number }>;
    topContent: Array<{ id: string; title: string; views: number; type: string }>;
    geoData: Array<{ state: string; users: number }>;
    timestamp: string;
  } }>('/admin/analytics/live');
}

// ─── Content Calendar ───
export function getCalendarAnnouncements(params: { start: string; end: string; status?: string; type?: string }) {
  return apiFetch<{ data: Array<{
    id: string;
    title: string;
    type: string;
    status: string;
    deadline?: string;
    publishAt?: string;
    createdAt: string;
  }> }>(`/admin/calendar${qs(params)}`);
}

export function bulkImportAnnouncements(data: unknown[]) {
  return apiFetchWithCsrf<{ data: {
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
    createdIds: string[];
  } }>('/admin/bulk-import', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getUpcomingDeadlines(limit = 10) {
  return apiFetch<{ data: Array<{
    id: string;
    title: string;
    deadline: string;
    daysLeft: number;
    type: string;
  }> }>(`/admin/upcoming-deadlines${qs({ limit })}`);
}

// ─── Notification Campaigns ───
export function getCampaigns() {
  return apiFetch<{ data: Array<{
    id: string;
    title: string;
    body: string;
    status: string;
    sentCount: number;
    createdAt: string;
    segment: { type: string; value: string };
  }> }>('/admin/campaigns');
}

export function createCampaign(data: {
  title: string;
  body: string;
  url?: string;
  segment: { type: string; value: string };
  scheduledAt?: string;
}) {
  return apiFetchWithCsrf<{ data: { id: string }; message: string }>('/admin/campaigns', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function sendCampaign(id: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/campaigns/${id}/send`, {
    method: 'POST',
  });
}

export function getSegments() {
  return apiFetch<{ data: {
    segments: {
      states: string[];
      categories: string[];
      languages: string[];
      totalUsers: number;
    };
    counts: Array<{ type: string; value: string; count: number }>;
  } }>('/admin/segments');
}

// ─── Workflow ───
export function assignAnnouncement(data: { announcementId: string; assigneeUserId: string; assigneeEmail: string; reviewDueAt?: string }) {
  return apiFetchWithCsrf('/admin/assign', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function approveAnnouncement(id: string, note?: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/approve/${id}`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function rejectAnnouncement(id: string, reason: string) {
  return apiFetchWithCsrf<{ message: string }>(`/admin/reject/${id}`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export function getPendingApprovals(assignee?: string) {
  return apiFetch<{ data: any[] }>(`/admin/pending-approvals${qs(assignee ? { assignee } : {})}`);
}

export function getWorkflowLogs(id: string) {
  return apiFetch<{ data: any[] }>(`/admin/workflow-logs/${id}`);
}

export function getSLAViolations() {
  return apiFetch<{ data: Array<{ id: string; title: string; assignee?: string; hoursOverdue: number }> }>('/admin/sla-violations');
}

// ─── User Engagement ───
export function getUserFeedback(limit = 50) {
  return apiFetch<{ data: any[] }>(`/admin/feedback${qs({ limit })}`);
}

export function getCommentsPending(limit = 50) {
  return apiFetch<{ data: any[] }>(`/admin/comments-pending${qs({ limit })}`);
}

export function moderateComment(id: string, action: 'approve' | 'reject') {
  return apiFetchWithCsrf<{ message: string }>(`/admin/moderate-comment/${id}`, {
    method: 'POST',
    body: JSON.stringify({ action }),
  });
}

export function getEngagementMetrics(days = 30) {
  return apiFetch<{ data: { feedbackCount: number; commentsCount: number; bookmarksCount: number } }>(`/admin/engagement-metrics${qs({ days })}`);
}

// ─── SEO Monitoring ───
export function getSEOMetrics() {
  return apiFetch<{ data: {
    metrics: { total: number; withMeta: number; indexed: number; withSchema: number; healthScore: number };
    queries: Array<{ _id: string; count: number; lastSearched: string }>;
    coverage: { indexed: number; noindex: number; missing: number };
  } }>('/admin/seo-metrics');
}

// ─── Low Priority: Backup & System ───
export function getBackups(limit = 20) {
  return apiFetch<{ data: any[] }>(`/admin/backups${qs({ limit })}`);
}

export async function exportAnnouncementsToCSV(): Promise<Response> {
  const csrfToken = await ensureCsrfToken();
  const res = await fetch(`${API_BASE}/admin/export/announcements`, {
    method: 'POST',
    headers: { [CSRF_HEADER_NAME]: csrfToken },
    credentials: 'include',
  });
  if (!res.ok) {
    const body = await parseBody(res);
    throw new ApiError(res.status, body);
  }
  return res;
}

export function getSecurityEvents(filters?: { type?: string; severity?: string }) {
  return apiFetch<{ data: any[] }>(`/admin/security/events${qs(filters || {})}`);
}

export function getSecurityStats() {
  return apiFetch<{ data: { totalEvents24h: number; criticalCount: number; failedLogins: number; suspiciousIPs: number; failedLoginsList: Array<{ ip: string; count: number }> } }>('/admin/security/stats');
}

export function getPerformanceSummary() {
  return apiFetch<{ data: {
    summary: { avgResponseTime: number; p95ResponseTime: number; p99ResponseTime: number; requestsPerMinute: number; errorRate: number };
    slowEndpoints: Array<{ route: string; avgDuration: number; count: number }>;
    errors: Array<{ code: number; count: number; percentage: number }>;
  } }>('/admin/performance/summary');
}

export function getRateLimitStats() {
  return apiFetch<{ data: {
    totalHits24h: number;
    uniqueIPs: number;
    mostLimited: Array<{ key: string; count: number }>;
    byEndpoint: Array<{ endpoint: string; hits: number; blocked: number }>;
  } }>('/admin/rate-limit/stats');
}

export function getSystemHealth() {
  return apiFetch<{ data: {
    health: { status: string; checks: any };
    services: { services: Array<{ name: string; status: string; lastChecked: string }> };
    errors: Array<{ message: string; count: number; timestamp: string }>;
  } }>('/admin/health');
}

// ─── Editorial CMS ───
export interface CmsPostFilters {
  type?: string;
  status?: string;
  search?: string;
  category?: string;
  state?: string;
  organization?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export function getEditorialDashboard() {
  return apiFetch<{ data: CmsDashboardData }>('/editorial/dashboard');
}

export function getCmsPosts(filters: CmsPostFilters = {}) {
  return apiFetch<PaginatedResponse<CmsPost>>(`/editorial/posts${qs(filters as Record<string, string | number | undefined>)}`);
}

export function getCmsPost(id: string) {
  return apiFetch<{ data: CmsPost }>(`/editorial/posts/${id}`);
}

export function createCmsPost(data: Record<string, unknown>) {
  return apiFetchWithCsrf<{ data: CmsPost }>('/editorial/posts', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateCmsPost(id: string, data: Record<string, unknown>) {
  return apiFetchWithCsrf<{ data: CmsPost }>(`/editorial/posts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

function editorialWorkflowAction(path: string, note?: string) {
  return apiFetchWithCsrf<{ data: CmsPost }>(path, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

export function submitCmsPost(id: string, note?: string) {
  return editorialWorkflowAction(`/editorial/posts/${id}/submit`, note);
}

export function approveCmsPost(id: string, note?: string) {
  return editorialWorkflowAction(`/editorial/posts/${id}/approve`, note);
}

export function publishCmsPost(id: string, note?: string) {
  return editorialWorkflowAction(`/editorial/posts/${id}/publish`, note);
}

export function unpublishCmsPost(id: string, note?: string) {
  return editorialWorkflowAction(`/editorial/posts/${id}/unpublish`, note);
}

export function archiveCmsPost(id: string, note?: string) {
  return editorialWorkflowAction(`/editorial/posts/${id}/archive`, note);
}

export function restoreCmsPost(id: string, note?: string) {
  return editorialWorkflowAction(`/editorial/posts/${id}/restore`, note);
}

export function getCmsPostHistory(id: string) {
  return apiFetch<{ data: { versions: any[]; audit: any[] } }>(`/editorial/posts/${id}/history`);
}

export function getCmsPostAlertPreview(id: string) {
  return apiFetch<{ data: AlertMatchPreview }>(`/editorial/posts/${id}/alert-preview`);
}

export function getEditorialTaxonomies(type: 'states' | 'organizations' | 'categories' | 'institutions' | 'exams' | 'qualifications') {
  return apiFetch<{ data: CmsTaxonomy[] }>(`/editorial/taxonomies/${type}`);
}

export function createEditorialTaxonomy(
  type: 'states' | 'organizations' | 'categories' | 'institutions' | 'exams' | 'qualifications',
  data: Partial<CmsTaxonomy>,
) {
  return apiFetchWithCsrf<{ data: CmsTaxonomy }>(`/editorial/taxonomies/${type}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function updateEditorialTaxonomy(
  type: 'states' | 'organizations' | 'categories' | 'institutions' | 'exams' | 'qualifications',
  id: string,
  data: Partial<CmsTaxonomy>,
) {
  return apiFetchWithCsrf<{ data: CmsTaxonomy }>(`/editorial/taxonomies/${type}/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteEditorialTaxonomy(
  type: 'states' | 'organizations' | 'categories' | 'institutions' | 'exams' | 'qualifications',
  id: string,
) {
  return apiFetchWithCsrf<{ message: string }>(`/editorial/taxonomies/${type}/${id}`, {
    method: 'DELETE',
  });
}

export function getEditorialAuditLog(filters: { limit?: number; offset?: number } = {}) {
  return apiFetch<{ data: any[]; total: number; count: number }>(`/editorial/audit-log${qs(filters as Record<string, string | number | undefined>)}`);
}

export function getEditorialWorkflowQueue() {
  return apiFetch<{ data: CmsPost[] }>('/editorial/workflow/pending');
}

export function getEditorialWorkflowSla() {
  return apiFetch<{ data: WorkflowViolation[] }>('/editorial/workflow/sla');
}

export function getEditorialWorkflowFreshness() {
  return apiFetch<{ data: CmsPost[] }>('/editorial/workflow/freshness');
}

export function getEditorialWorkflowTrust(limit = 24) {
  return apiFetch<{ data: CmsPost[] }>(`/editorial/workflow/trust${qs({ limit })}`);
}

export function getEditorialWorkflowSearchReadiness(limit = 24) {
  return apiFetch<{ data: CmsPost[] }>(`/editorial/workflow/search-readiness${qs({ limit })}`);
}

export function getEditorialWorkflowSeo(limit = 24) {
  return apiFetch<{ data: CmsPost[] }>(`/editorial/workflow/seo${qs({ limit })}`);
}

export function getEditorialWorkflowAlertsImpact(limit = 12) {
  return apiFetch<{ data: AlertImpactQueueItem[] }>(`/editorial/workflow/alerts-impact${qs({ limit })}`);
}

export function bulkTransitionCmsPosts(
  ids: string[],
  action: 'submit' | 'approve' | 'publish' | 'unpublish' | 'archive' | 'restore',
  note?: string,
) {
  return apiFetchWithCsrf<{ data: EditorialBulkTransitionResult }>('/editorial/workflow/bulk-transition', {
    method: 'POST',
    body: JSON.stringify({ ids, action, note }),
  });
}

export function runEditorialFreshnessSweep(params: { limit?: number; dryRun?: boolean; note?: string } = {}) {
  return apiFetchWithCsrf<{
    data: {
      dryRun: boolean;
      totalCandidates: number;
      archivedCount: number;
      candidates: CmsPost[];
      archived: CmsPost[];
      failures: Array<{ id: string; error: string }>;
      revalidatedCount: number;
    };
  }>('/editorial/workflow/freshness/sweep', {
    method: 'POST',
    body: JSON.stringify(params),
  });
}

export function getEditorialSubscriberCoverage(limit = 10) {
  return apiFetch<{ data: AlertPreferenceCoverage }>(`/editorial/alert-subscriptions/coverage${qs({ limit })}`);
}
