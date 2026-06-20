'use client';

import { Bell, Bookmark, CalendarClock, LayoutDashboard, LoaderCircle, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PushNotificationOptIn } from '@/app/components/public-site/PushNotificationOptIn';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { deleteTrackedApplication, getProfile, listBookmarks, listSavedSearches, listTrackedApplications, removeBookmark, updateProfile, updateSavedSearch, updateTrackedApplication, type BookmarkItem, type SavedSearch, type TrackedApplication, type UserProfile } from '@/lib/user-api';
import { cn } from '@/lib/utils';

const links = [
  ['/dashboard', 'Overview', LayoutDashboard], ['/dashboard/saved', 'Saved', Bookmark], ['/dashboard/tracked', 'Tracked', CalendarClock], ['/dashboard/alerts', 'Alerts', Bell], ['/dashboard/settings', 'Settings', Settings],
] as const;
function hrefFor(item: { type: string; slug: string }) {
  const section = item.type === 'job' ? 'jobs' : item.type === 'result' ? 'results' : item.type === 'admit-card' ? 'admit-cards' : item.type === 'admission' ? 'admissions' : item.type === 'answer-key' ? 'answer-keys' : 'syllabus';
  return `/${section}/${item.slug}`;
}
function Card({ children }: { children: React.ReactNode }) { return <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">{children}</div> }

export function UserDashboard() {
  const pathname = usePathname();
  const { user, isLoggedIn, isLoading } = useCurrentUser();
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);
  const [tracked, setTracked] = useState<TrackedApplication[]>([]);
  const [searches, setSearches] = useState<SavedSearch[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isLoading) return;
    if (!isLoggedIn) return;
    Promise.allSettled([listBookmarks(), listTrackedApplications(), listSavedSearches(), getProfile()])
      .then(([saved, applications, alerts, settings]) => {
        if (saved.status === 'fulfilled') setBookmarks(saved.value);
        if (applications.status === 'fulfilled') setTracked(applications.value);
        if (alerts.status === 'fulfilled') setSearches(alerts.value);
        if (settings.status === 'fulfilled') setProfile(settings.value);
        const failure = [saved, applications, alerts, settings].find((result) => result.status === 'rejected');
        if (failure?.status === 'rejected') setMessage(failure.reason instanceof Error ? failure.reason.message : 'Some dashboard data could not be loaded.');
      })
      .finally(() => setLoading(false));
  }, [isLoading, isLoggedIn]);

  async function unsave(id: string) { try { await removeBookmark(id); setBookmarks((items) => items.filter((item) => item.id !== id)); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not remove item.'); } }
  async function untrack(id: string) { try { await deleteTrackedApplication(id); setTracked((items) => items.filter((item) => item.id !== id)); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not remove item.'); } }
  async function setStatus(item: TrackedApplication, status: TrackedApplication['status']) { try { const next = await updateTrackedApplication(item.id, { status }); setTracked((items) => items.map((value) => value.id === item.id ? next : value)); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update status.'); } }
  async function toggleSearch(item: SavedSearch) { try { const next = await updateSavedSearch(item.id, { notificationsEnabled: !item.notificationsEnabled }); setSearches((items) => items.map((value) => value.id === item.id ? next : value)); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not update alert.'); } }
  async function saveProfile(input: Partial<UserProfile>) { if (!profile) return; try { setProfile(await updateProfile(input)); setMessage('Settings saved.'); } catch (e) { setMessage(e instanceof Error ? e.message : 'Could not save settings.'); } }

  if (isLoading || (isLoggedIn && loading)) return <div className="mx-auto flex min-h-[55vh] max-w-6xl items-center justify-center"><LoaderCircle className="animate-spin text-orange-600" /></div>;
  if (!isLoggedIn) return <div className="mx-auto max-w-xl px-4 py-20"><Card><h1 className="text-xl font-extrabold text-gray-900">Sign in to open your dashboard</h1><p className="mt-2 text-sm text-gray-600">Your saved updates, deadline reminders, and alert preferences are kept with your account.</p><Link href="/login" className="mt-5 inline-flex rounded-xl bg-[#e65100] px-5 py-2.5 text-sm font-bold text-white">Sign in</Link></Card></div>;

  const isOverview = pathname === '/dashboard';
  return <div className="mx-auto max-w-6xl px-4 py-8">
    <div className="mb-6"><p className="text-xs font-bold uppercase tracking-widest text-orange-600">My account</p><h1 className="text-2xl font-extrabold text-gray-900">{user?.name || 'Your'} dashboard</h1></div>
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <nav className="flex gap-2 overflow-x-auto lg:flex-col">{links.map(([href, label, Icon]) => <Link key={href} href={href} className={cn('flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold', pathname === href ? 'bg-orange-600 text-white' : 'bg-white text-gray-600 hover:bg-orange-50')}><Icon size={16} />{label}</Link>)}</nav>
      <section className="space-y-4">{message ? <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">{message}</div> : null}
        {isOverview ? <><div className="grid gap-4 sm:grid-cols-3"><Card><Bookmark className="text-orange-600" /><div className="mt-3 text-3xl font-black">{bookmarks.length}</div><div className="text-sm text-gray-500">Saved updates</div></Card><Card><CalendarClock className="text-purple-600" /><div className="mt-3 text-3xl font-black">{tracked.length}</div><div className="text-sm text-gray-500">Tracked deadlines</div></Card><Card><Bell className="text-blue-600" /><div className="mt-3 text-3xl font-black">{searches.filter((item) => item.notificationsEnabled).length}</div><div className="text-sm text-gray-500">Active alerts</div></Card></div><Card><h2 className="font-extrabold">Upcoming deadlines</h2><ItemList items={tracked.slice(0, 4)} empty="No deadlines tracked yet." /></Card></> : null}
        {pathname === '/dashboard/saved' ? <Card><h2 className="mb-4 text-lg font-extrabold">Saved jobs and updates</h2>{bookmarks.length ? <div className="divide-y">{bookmarks.map((item) => <div key={item.id} className="flex items-center gap-3 py-4"><Link href={hrefFor(item)} className="min-w-0 flex-1 font-semibold text-gray-800 hover:text-orange-700">{item.title}</Link><button onClick={() => unsave(item.id)} aria-label="Remove saved item" className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div>)}</div> : <Empty text="You have not saved any updates yet." />}</Card> : null}
        {pathname === '/dashboard/tracked' ? <Card><h2 className="mb-4 text-lg font-extrabold">Tracked applications and deadlines</h2>{tracked.length ? <div className="divide-y">{tracked.map((item) => <div key={item.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center"><div><Link href={hrefFor(item)} className="font-semibold hover:text-orange-700">{item.title}</Link><p className="mt-1 text-xs text-gray-500">{item.deadline ? `Deadline ${new Date(item.deadline).toLocaleDateString('en-IN')}` : 'No deadline available'}</p></div><select value={item.status} onChange={(e) => setStatus(item, e.target.value as TrackedApplication['status'])} className="rounded-lg border px-3 py-2 text-sm"><option value="saved">Saved</option><option value="applied">Applied</option><option value="admit-card">Admit card</option><option value="exam">Exam</option><option value="result">Result</option></select><button onClick={() => untrack(item.id)} className="rounded-lg p-2 text-red-600"><Trash2 size={16} /></button></div>)}</div> : <Empty text="No tracked applications yet." />}</Card> : null}
        {pathname === '/dashboard/alerts' ? <><Card><h2 className="mb-4 text-lg font-extrabold">Saved search alerts</h2>{searches.length ? searches.map((item) => <div key={item.id} className="flex items-center justify-between border-b py-3 last:border-0"><div><div className="font-semibold">{item.name}</div><div className="text-xs text-gray-500">{item.query || 'Filtered search'} · {item.frequency}</div></div><button onClick={() => toggleSearch(item)} className={cn('rounded-full px-3 py-1.5 text-xs font-bold', item.notificationsEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>{item.notificationsEnabled ? 'On' : 'Off'}</button></div>) : <Empty text="No saved search alerts yet." />}</Card><PushNotificationOptIn /></> : null}
        {pathname === '/dashboard/settings' && profile ? <Card><h2 className="mb-5 text-lg font-extrabold">Notification settings</h2><div className="space-y-4"><Toggle label="Email notifications" checked={profile.emailNotifications} onChange={(value) => saveProfile({ emailNotifications: value })} /><Toggle label="Push notifications" checked={profile.pushNotifications} onChange={(value) => saveProfile({ pushNotifications: value })} /><label className="block text-sm font-semibold">Digest frequency<select value={profile.notificationFrequency} onChange={(e) => saveProfile({ notificationFrequency: e.target.value as UserProfile['notificationFrequency'] })} className="mt-2 block w-full rounded-xl border px-3 py-2 font-normal"><option value="instant">Instant</option><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label><PushNotificationOptIn /></div></Card> : null}
      </section>
    </div>
  </div>;
}

function Empty({ text }: { text: string }) { return <p className="rounded-xl bg-gray-50 p-5 text-sm text-gray-500">{text}</p> }
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex items-center justify-between text-sm font-semibold"><span>{label}</span><input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-5 w-5 accent-orange-600" /></label> }
function ItemList({ items, empty }: { items: TrackedApplication[]; empty: string }) { return items.length ? <div className="mt-3 divide-y">{items.map((item) => <Link key={item.id} href={hrefFor(item)} className="flex justify-between gap-4 py-3 text-sm"><span className="font-semibold">{item.title}</span><span className="shrink-0 text-gray-500">{item.deadline ? new Date(item.deadline).toLocaleDateString('en-IN') : 'No date'}</span></Link>)}</div> : <Empty text={empty} /> }
