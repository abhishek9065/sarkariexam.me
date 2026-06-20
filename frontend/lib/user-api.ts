import { resolvePublicApiBase } from './api';

export type ContentType = 'job' | 'result' | 'admit-card' | 'admission' | 'answer-key' | 'syllabus';
export type TrackerStatus = 'saved' | 'applied' | 'admit-card' | 'exam' | 'result';
export interface BookmarkItem { id: string; slug: string; title: string; type: ContentType; organization?: string | { name?: string }; lastDate?: string | null }
export interface TrackedApplication { id: string; announcementId?: string; slug: string; type: ContentType; title: string; organization?: string; deadline?: string | null; reminderAt?: string | null; status: TrackerStatus; notes?: string }
export interface UserProfile { preferredCategories: string[]; preferredQualifications: string[]; preferredLocations: string[]; preferredOrganizations: string[]; emailNotifications: boolean; pushNotifications: boolean; notificationFrequency: 'instant' | 'daily' | 'weekly'; alertWindowDays: number; alertMaxItems: number }
export interface SavedSearch { id: string; name: string; query: string; notificationsEnabled: boolean; frequency: 'instant' | 'daily' | 'weekly'; filters?: Record<string, string | number> }

function cookie(name: string) {
  if (typeof document === 'undefined') return null;
  const value = document.cookie.split('; ').find((entry) => entry.startsWith(`${name}=`));
  return value ? decodeURIComponent(value.slice(name.length + 1)) : null;
}
async function csrfToken() {
  const existing = cookie('csrf_token');
  if (existing) return existing;
  const response = await fetch(`${resolvePublicApiBase()}/auth/csrf`, { credentials: 'include' });
  const body = await response.json().catch(() => null);
  return body?.data?.csrfToken ?? cookie('csrf_token');
}
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body) headers.set('Content-Type', 'application/json');
  if (init.method && init.method !== 'GET') {
    const token = await csrfToken();
    if (token) headers.set('x-csrf-token', token);
  }
  const response = await fetch(`${resolvePublicApiBase()}${path}`, { ...init, headers, credentials: 'include' });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = body?.message ?? body?.error;
    throw new Error(response.status === 401 ? 'Please sign in to continue.' : typeof detail === 'string' ? detail : 'Request failed. Please try again.');
  }
  return body as T;
}
export async function listBookmarkIds() { return (await request<{ data: string[] }>('/bookmarks/ids')).data }
export async function listBookmarks() { return (await request<{ data: BookmarkItem[] }>('/bookmarks')).data }
export function addBookmark(announcementId: string) { return request('/bookmarks', { method: 'POST', body: JSON.stringify({ announcementId }) }) }
export function removeBookmark(announcementId: string) { return request(`/bookmarks/${encodeURIComponent(announcementId)}`, { method: 'DELETE' }) }
export async function listTrackedApplications() { return (await request<{ data: TrackedApplication[] }>('/profile/tracked-applications')).data }
export async function trackApplication(input: Omit<TrackedApplication, 'id'>) { return (await request<{ data: TrackedApplication }>('/profile/tracked-applications', { method: 'POST', body: JSON.stringify(input) })).data }
export async function updateTrackedApplication(id: string, input: Partial<Pick<TrackedApplication, 'status' | 'notes' | 'reminderAt'>>) { return (await request<{ data: TrackedApplication }>(`/profile/tracked-applications/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) })).data }
export function deleteTrackedApplication(id: string) { return request(`/profile/tracked-applications/${encodeURIComponent(id)}`, { method: 'DELETE' }) }
export async function getProfile() { return (await request<{ data: UserProfile }>('/profile')).data }
export async function updateProfile(input: Partial<UserProfile>) { return (await request<{ data: UserProfile }>('/profile', { method: 'PUT', body: JSON.stringify(input) })).data }
export async function listSavedSearches() { return (await request<{ data: SavedSearch[] }>('/profile/saved-searches')).data }
export async function updateSavedSearch(id: string, input: Partial<SavedSearch>) { return (await request<{ data: SavedSearch }>(`/profile/saved-searches/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(input) })).data }
export function subscribePush(subscription: PushSubscriptionJSON) { return request('/push/subscribe?source=public_opt_in', { method: 'POST', body: JSON.stringify(subscription) }) }
