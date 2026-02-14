import { useState, useEffect, useCallback } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import type { Announcement, ContentType, AnnouncementStatus } from '../types';

/* ─── API helpers (admin-specific) ─── */
const BASE = import.meta.env.VITE_API_BASE ? `${import.meta.env.VITE_API_BASE}/api` : '/api';

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string> || {}),
    };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${BASE}${path}`, { ...options, headers, credentials: 'include' });
    if (!res.ok) throw new Error(`Admin API error ${res.status}`);
    return res.json();
}

interface DashboardStats {
    total: number;
    published: number;
    draft: number;
    archived: number;
    users: number;
    views: number;
}

interface DashboardData {
    stats?: Partial<DashboardStats>;
    overview?: {
        totalAnnouncements?: number;
        totalUsers?: number;
        totalViews?: number;
        activeJobs?: number;
    };
    recent?: Announcement[];
}

interface AdminListResponse {
    data: Announcement[];
    total: number;
}

type ViewMode = 'dashboard' | 'list' | 'create' | 'edit';

const STATUS_OPTIONS: AnnouncementStatus[] = ['draft', 'pending', 'published', 'archived'];
const TYPE_OPTIONS: ContentType[] = ['job', 'result', 'admit-card', 'answer-key', 'admission', 'syllabus'];

const EMPTY_DASHBOARD_STATS: DashboardStats = {
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    users: 0,
    views: 0,
};

function getDashboardStats(data: DashboardData | null): DashboardStats {
    if (!data) return EMPTY_DASHBOARD_STATS;
    if (data.stats) {
        return {
            ...EMPTY_DASHBOARD_STATS,
            ...data.stats,
        };
    }
    if (data.overview) {
        return {
            ...EMPTY_DASHBOARD_STATS,
            total: data.overview.totalAnnouncements ?? 0,
            published: data.overview.activeJobs ?? 0,
            users: data.overview.totalUsers ?? 0,
            views: data.overview.totalViews ?? 0,
        };
    }
    return EMPTY_DASHBOARD_STATS;
}

export default function AdminPage() {
    const { user, hasAdminPortalAccess, can } = useAuth();
    const [view, setView] = useState<ViewMode>('dashboard');
    const [dashData, setDashData] = useState<DashboardData | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [total, setTotal] = useState(0);
    const [listLoading, setListLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterType, setFilterType] = useState<string>('');
    const [search, setSearch] = useState('');
    const [offset, setOffset] = useState(0);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [accessNotice, setAccessNotice] = useState<string | null>(null);
    const LIMIT = 20;
    const canReadAdmin = can('admin:read');
    const canWriteAnnouncements = can('announcements:write');
    const canDeleteAnnouncements = can('announcements:delete');

    useEffect(() => {
        if (!canWriteAnnouncements && (view === 'create' || view === 'edit')) {
            setView('dashboard');
            setEditingId(null);
            setAccessNotice('Read-only role: changes are restricted for your account.');
        }
    }, [canWriteAnnouncements, view]);

    /* Dashboard data */
    useEffect(() => {
        adminFetch<{ data?: DashboardData } & Partial<DashboardData>>('/admin/dashboard')
            .then((res) => {
                setDashData(res.data || res as unknown as DashboardData);
            })
            .catch(console.error);
    }, []);

    /* List loader */
    const loadList = useCallback(async (newOffset = 0) => {
        setListLoading(true);
        try {
            const params = new URLSearchParams({ limit: String(LIMIT), offset: String(newOffset) });
            if (filterStatus && filterStatus !== 'all') params.set('status', filterStatus);
            if (filterType) params.set('type', filterType);
            if (search.trim()) params.set('search', search.trim());
            const res = await adminFetch<AdminListResponse>(`/admin/announcements?${params}`);
            setAnnouncements(Array.isArray(res.data) ? res.data : []);
            setTotal(typeof res.total === 'number' ? res.total : 0);
            setOffset(newOffset);
        } catch (err) {
            console.error('Admin list error:', err);
        } finally {
            setListLoading(false);
        }
    }, [filterStatus, filterType, search]);

    useEffect(() => {
        if (view === 'list') loadList(0);
    }, [view, loadList]);

    /* Delete */
    const handleDelete = async (id: string) => {
        if (!canDeleteAnnouncements) {
            setAccessNotice('Read-only role: changes are restricted for your account.');
            return;
        }
        if (!confirm('Delete this announcement permanently?')) return;
        try {
            await adminFetch(`/admin/announcements/${id}`, { method: 'DELETE' });
            setAnnouncements((prev) => prev.filter((a) => a.id !== id));
            setTotal((t) => t - 1);
        } catch (err) {
            alert('Delete failed');
        }
    };

    if (!hasAdminPortalAccess || !canReadAdmin) {
        return (
            <Layout>
                <div className="admin-page animate-fade-in">
                    <div className="card" style={{ padding: 24 }}>
                        <h2>Access denied</h2>
                        <p className="text-muted" style={{ marginTop: 8 }}>
                            Your account does not have permission to access the admin command center.
                        </p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="admin-page animate-fade-in">
                <div className="admin-header">
                    <h1>⚙️ Admin Panel</h1>
                    <span className="text-muted">Welcome, {user?.username}</span>
                </div>

                {!canWriteAnnouncements && (
                    <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                        <strong>Read-only role: changes are restricted for your account.</strong>
                    </div>
                )}

                {accessNotice && (
                    <div className="card" style={{ padding: 14, marginBottom: 16 }}>
                        {accessNotice}
                    </div>
                )}

                {/* Nav */}
                <div className="admin-nav">
                    <button className={`admin-nav-btn${view === 'dashboard' ? ' active' : ''}`} onClick={() => setView('dashboard')}>
                        📊 Dashboard
                    </button>
                    <button className={`admin-nav-btn${view === 'list' ? ' active' : ''}`} onClick={() => setView('list')}>
                        📋 Announcements
                    </button>
                    {canWriteAnnouncements && (
                        <button className={`admin-nav-btn${view === 'create' ? ' active' : ''}`} onClick={() => { setView('create'); setEditingId(null); }}>
                            ➕ Create New
                        </button>
                    )}
                </div>

                {/* Dashboard view */}
                {view === 'dashboard' && (
                    <DashboardView data={dashData} onNavigate={setView} canWriteAnnouncements={canWriteAnnouncements} />
                )}

                {/* List view */}
                {view === 'list' && (
                    <div className="admin-list-view">
                        <div className="filters-bar">
                            <div className="filters-row">
                                <input className="input filter-search" placeholder="Search announcements…" value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && loadList(0)} />
                                <select className="input filter-field" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                                    <option value="all">All Status</option>
                                    {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                                </select>
                                <select className="input filter-field" value={filterType} onChange={(e) => setFilterType(e.target.value)}>
                                    <option value="">All Types</option>
                                    {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <button className="btn btn-accent btn-sm" onClick={() => loadList(0)}>Filter</button>
                            </div>
                        </div>

                        {listLoading ? (
                            <div style={{ textAlign: 'center', padding: 40 }}>Loading…</div>
                        ) : (
                            <>
                                <div className="admin-table-wrapper">
                                    <table className="admin-table">
                                        <thead>
                                            <tr>
                                                <th>Title</th>
                                                <th>Type</th>
                                                <th>Status</th>
                                                <th>Views</th>
                                                <th>Date</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {announcements.map((a) => (
                                                <tr key={a.id}>
                                                    <td className="admin-title-cell">{a.title}</td>
                                                    <td><span className={`badge badge-${a.type}`}>{a.type}</span></td>
                                                    <td><span className={`badge admin-status-${a.status}`}>{a.status}</span></td>
                                                    <td>{(a.viewCount ?? 0).toLocaleString()}</td>
                                                    <td>{new Date(a.postedAt).toLocaleDateString('en-IN')}</td>
                                                    <td className="admin-actions-cell">
                                                        {canWriteAnnouncements && (
                                                            <button className="btn btn-ghost btn-sm" onClick={() => { setEditingId(a.id); setView('edit'); }} title="Edit">✏️</button>
                                                        )}
                                                        {canDeleteAnnouncements && (
                                                            <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(a.id)} title="Delete">🗑️</button>
                                                        )}
                                                        {!canWriteAnnouncements && !canDeleteAnnouncements && (
                                                            <span className="text-muted">Read-only</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="admin-pagination">
                                    <span className="text-muted">
                                        Showing {total === 0 ? 0 : offset + 1}–{total === 0 ? 0 : Math.min(offset + LIMIT, total)} of {total}
                                    </span>
                                    <div className="admin-pagination-btns">
                                        <button className="btn btn-ghost btn-sm" disabled={offset === 0} onClick={() => loadList(Math.max(0, offset - LIMIT))}>← Prev</button>
                                        <button className="btn btn-ghost btn-sm" disabled={offset + LIMIT >= total} onClick={() => loadList(offset + LIMIT)}>Next →</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Create / Edit view */}
                {(view === 'create' || view === 'edit') && canWriteAnnouncements && (
                    <AnnouncementForm
                        announcementId={editingId}
                        onSaved={() => { setView('list'); loadList(0); }}
                        onCancel={() => setView('list')}
                    />
                )}
            </div>
        </Layout>
    );
}

/* ──────── Dashboard View ──────── */
function DashboardView({
    data,
    onNavigate,
    canWriteAnnouncements,
}: {
    data: DashboardData | null;
    onNavigate: (v: ViewMode) => void;
    canWriteAnnouncements: boolean;
}) {
    if (!data) return <div style={{ textAlign: 'center', padding: 40 }}>Loading dashboard…</div>;

    const stats = getDashboardStats(data);

    return (
        <div className="admin-dashboard">
            <div className="admin-stats-grid">
                <StatCard icon="📄" label="Total" value={stats.total} />
                <StatCard icon="✅" label="Published" value={stats.published} color="var(--success)" />
                <StatCard icon="📝" label="Drafts" value={stats.draft} color="var(--warning)" />
                <StatCard icon="📦" label="Archived" value={stats.archived} />
                <StatCard icon="👥" label="Users" value={stats.users} color="var(--accent)" />
                <StatCard icon="👁️" label="Total Views" value={stats.views} />
            </div>

            <div className="admin-quick-actions">
                <h3>Quick Actions</h3>
                <div className="admin-actions-row">
                    {canWriteAnnouncements && (
                        <button className="btn btn-accent" onClick={() => onNavigate('create')}>➕ Create Announcement</button>
                    )}
                    <button className="btn btn-outline" onClick={() => onNavigate('list')}>📋 View All Announcements</button>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color }: { icon: string; label: string; value: number; color?: string }) {
    return (
        <div className="card admin-stat-card">
            <span className="admin-stat-icon">{icon}</span>
            <div>
                <span className="admin-stat-value" style={color ? { color } : undefined}>{value.toLocaleString()}</span>
                <span className="admin-stat-label">{label}</span>
            </div>
        </div>
    );
}

/* ──────── Announcement Form ──────── */
function AnnouncementForm({ announcementId, onSaved, onCancel }: {
    announcementId: string | null;
    onSaved: () => void;
    onCancel: () => void;
}) {
    const isEdit = !!announcementId;
    const [loading, setLoading] = useState(isEdit);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        title: '', type: 'job' as ContentType, category: '', organization: '',
        content: '', externalLink: '', location: '', deadline: '',
        minQualification: '', ageLimit: '', applicationFee: '',
        salaryMin: '', salaryMax: '', totalPosts: '',
        status: 'draft' as AnnouncementStatus, tags: '',
    });

    useEffect(() => {
        if (!isEdit || !announcementId) return;
        adminFetch<{ data: Announcement }>(`/admin/announcements/${announcementId}`)
            .then(({ data }) => {
                setForm({
                    title: data.title,
                    type: data.type,
                    category: data.category,
                    organization: data.organization,
                    content: data.content || '',
                    externalLink: data.externalLink || '',
                    location: data.location || '',
                    deadline: data.deadline ? data.deadline.slice(0, 10) : '',
                    minQualification: data.minQualification || '',
                    ageLimit: data.ageLimit || '',
                    applicationFee: data.applicationFee || '',
                    salaryMin: data.salaryMin ? String(data.salaryMin) : '',
                    salaryMax: data.salaryMax ? String(data.salaryMax) : '',
                    totalPosts: data.totalPosts ? String(data.totalPosts) : '',
                    status: data.status || 'draft',
                    tags: (data.tags || []).map((t) => t.name).join(', '),
                });
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [isEdit, announcementId]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const body: Record<string, unknown> = {
                title: form.title,
                type: form.type,
                category: form.category,
                organization: form.organization,
                content: form.content || undefined,
                externalLink: form.externalLink || undefined,
                location: form.location || undefined,
                deadline: form.deadline || undefined,
                minQualification: form.minQualification || undefined,
                ageLimit: form.ageLimit || undefined,
                applicationFee: form.applicationFee || undefined,
                salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
                salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
                totalPosts: form.totalPosts ? Number(form.totalPosts) : undefined,
                status: form.status,
                tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
            };

            if (isEdit) {
                await adminFetch(`/admin/announcements/${announcementId}`, { method: 'PUT', body: JSON.stringify(body) });
            } else {
                await adminFetch('/admin/announcements', { method: 'POST', body: JSON.stringify(body) });
            }
            onSaved();
        } catch (err) {
            alert('Save failed. Check console for details.');
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: 40 }}>Loading…</div>;

    const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
        setForm((f) => ({ ...f, [field]: e.target.value }));

    return (
        <form className="admin-form card" onSubmit={handleSubmit}>
            <h2>{isEdit ? '✏️ Edit Announcement' : '➕ Create Announcement'}</h2>

            <div className="admin-form-grid">
                <label className="admin-form-field span-2">
                    <span className="admin-form-label">Title *</span>
                    <input className="input" required minLength={10} value={form.title} onChange={set('title')} />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Type *</span>
                    <select className="input" required value={form.type} onChange={set('type')}>
                        {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Status *</span>
                    <select className="input" required value={form.status} onChange={set('status')}>
                        {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Category *</span>
                    <input className="input" required value={form.category} onChange={set('category')} placeholder="e.g. Central Government" />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Organization *</span>
                    <input className="input" required value={form.organization} onChange={set('organization')} placeholder="e.g. UPSC" />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Location</span>
                    <input className="input" value={form.location} onChange={set('location')} placeholder="e.g. All India" />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Deadline</span>
                    <input className="input" type="date" value={form.deadline} onChange={set('deadline')} />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Qualification</span>
                    <input className="input" value={form.minQualification} onChange={set('minQualification')} placeholder="e.g. Graduate" />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Age Limit</span>
                    <input className="input" value={form.ageLimit} onChange={set('ageLimit')} placeholder="e.g. 18-35" />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Application Fee</span>
                    <input className="input" value={form.applicationFee} onChange={set('applicationFee')} placeholder="e.g. ₹100" />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Salary Min</span>
                    <input className="input" type="number" value={form.salaryMin} onChange={set('salaryMin')} />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Salary Max</span>
                    <input className="input" type="number" value={form.salaryMax} onChange={set('salaryMax')} />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">Total Posts</span>
                    <input className="input" type="number" value={form.totalPosts} onChange={set('totalPosts')} />
                </label>

                <label className="admin-form-field">
                    <span className="admin-form-label">External Link</span>
                    <input className="input" type="url" value={form.externalLink} onChange={set('externalLink')} placeholder="https://..." />
                </label>

                <label className="admin-form-field span-2">
                    <span className="admin-form-label">Tags (comma-separated)</span>
                    <input className="input" value={form.tags} onChange={set('tags')} placeholder="ssc, upsc, railway" />
                </label>

                <label className="admin-form-field span-2">
                    <span className="admin-form-label">Content (HTML)</span>
                    <textarea className="input admin-content-textarea" rows={12} value={form.content} onChange={set('content')} placeholder="Full HTML content…" />
                </label>
            </div>

            <div className="admin-form-actions">
                <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancel</button>
                <button type="submit" className="btn btn-accent" disabled={saving}>
                    {saving ? 'Saving…' : (isEdit ? 'Update' : 'Create')}
                </button>
            </div>
        </form>
    );
}
