'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState, type ComponentType, type CSSProperties } from 'react';
import {
  AlertCircle,
  ArrowUpRight,
  BookOpen,
  Briefcase,
  CheckCircle,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Eye,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Trophy,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type PostCategory = 'Latest Jobs' | 'Results' | 'Admit Card' | 'Answer Key' | 'Syllabus';
type PostStatus = 'active' | 'draft' | 'scheduled' | 'expired';
type PostTag = 'hot' | 'new' | 'update' | 'last-date' | 'none';
type SortField = 'views' | 'date' | 'title';
type BulkAction = 'publish' | 'draft' | 'delete' | '';
type IconComponent = ComponentType<{ className?: string; style?: CSSProperties; size?: string | number }>;

type ManagedPost = {
  id: string;
  title: string;
  org: string;
  category: PostCategory;
  postCount: string;
  lastDate: string;
  status: PostStatus;
  tag: PostTag;
  publishedDate: string;
  views: number;
  slug: string;
  gradientFrom: string;
  gradientTo: string;
};

const POSTS: ManagedPost[] = [
  { id: '1', title: 'SSC CGL 2026 - Combined Graduate Level', org: 'Staff Selection Commission', category: 'Latest Jobs', postCount: '14,582', lastDate: '30 Apr 2026', status: 'active', tag: 'hot', publishedDate: '28 Mar 2026', views: 234891, slug: 'ssc-cgl-2026', gradientFrom: '#1a237e', gradientTo: '#283593' },
  { id: '2', title: 'UPSC Civil Services (CSE) 2026', org: 'UPSC', category: 'Latest Jobs', postCount: '1,056', lastDate: '22 Apr 2026', status: 'active', tag: 'new', publishedDate: '27 Mar 2026', views: 98320, slug: 'upsc-cse-2026', gradientFrom: '#b71c1c', gradientTo: '#c62828' },
  { id: '3', title: 'Railway Group D 2026 - 32,438 Vacancies', org: 'RRB', category: 'Latest Jobs', postCount: '32,438', lastDate: '15 May 2026', status: 'active', tag: 'hot', publishedDate: '26 Mar 2026', views: 215000, slug: 'railway-group-d-2026', gradientFrom: '#0d47a1', gradientTo: '#1565c0' },
  { id: '4', title: 'Bihar Police Constable 2026', org: 'Bihar Police', category: 'Latest Jobs', postCount: '21,391', lastDate: '25 Apr 2026', status: 'active', tag: 'hot', publishedDate: '19 Mar 2026', views: 89540, slug: 'bihar-police-2026', gradientFrom: '#1b5e20', gradientTo: '#2e7d32' },
  { id: '5', title: 'IBPS PO 2026 Notification', org: 'IBPS', category: 'Latest Jobs', postCount: '4,455', lastDate: '10 May 2026', status: 'active', tag: 'new', publishedDate: '18 Mar 2026', views: 54320, slug: 'ibps-po-2026', gradientFrom: '#1a237e', gradientTo: '#283593' },
  { id: '6', title: 'UP Police Constable 2026', org: 'UPPRPB', category: 'Latest Jobs', postCount: '60,244', lastDate: '20 Apr 2026', status: 'active', tag: 'hot', publishedDate: '15 Mar 2026', views: 325670, slug: 'up-police-constable-2026', gradientFrom: '#1a237e', gradientTo: '#283593' },
  { id: '7', title: 'SSC CPO 2026 Sub-Inspector', org: 'SSC', category: 'Latest Jobs', postCount: '4,187', lastDate: '15 May 2026', status: 'draft', tag: 'new', publishedDate: '-', views: 0, slug: 'ssc-cpo-2026', gradientFrom: '#1a237e', gradientTo: '#283593' },
  { id: '8', title: 'UPSC NDA 2026', org: 'UPSC', category: 'Latest Jobs', postCount: '400', lastDate: '30 Apr 2026', status: 'active', tag: 'last-date', publishedDate: '17 Mar 2026', views: 43210, slug: 'upsc-nda-2026', gradientFrom: '#b71c1c', gradientTo: '#c62828' },
  { id: '9', title: 'RRB NTPC 2026 Recruitment', org: 'RRB', category: 'Latest Jobs', postCount: '8,113', lastDate: 'Closed', status: 'expired', tag: 'none', publishedDate: '10 Feb 2026', views: 178900, slug: 'rrb-ntpc-2026', gradientFrom: '#1a237e', gradientTo: '#283593' },
  { id: '10', title: 'SSC CGL Tier-I Result 2025', org: 'SSC', category: 'Results', postCount: '-', lastDate: '-', status: 'active', tag: 'new', publishedDate: '25 Mar 2026', views: 45230, slug: 'ssc-cgl-2025-result', gradientFrom: '#1b5e20', gradientTo: '#2e7d32' },
  { id: '11', title: 'IBPS PO Mains Result 2025', org: 'IBPS', category: 'Results', postCount: '-', lastDate: '-', status: 'active', tag: 'update', publishedDate: '24 Mar 2026', views: 38450, slug: 'ibps-po-mains-result-2025', gradientFrom: '#1b5e20', gradientTo: '#2e7d32' },
  { id: '12', title: 'UPSC NDA 2025 Result Declared', org: 'UPSC', category: 'Results', postCount: '-', lastDate: '-', status: 'active', tag: 'hot', publishedDate: '20 Mar 2026', views: 67000, slug: 'upsc-nda-2025-result', gradientFrom: '#b71c1c', gradientTo: '#c62828' },
  { id: '13', title: 'UPSC CSE Prelims Admit Card 2026', org: 'UPSC', category: 'Admit Card', postCount: '-', lastDate: '28 May 2026', status: 'active', tag: 'new', publishedDate: '23 Mar 2026', views: 67890, slug: 'upsc-cse-admit-card-2026', gradientFrom: '#4a148c', gradientTo: '#6a1b9a' },
  { id: '14', title: 'SSC CGL Admit Card 2026', org: 'SSC', category: 'Admit Card', postCount: '-', lastDate: '20 Jun 2026', status: 'draft', tag: 'new', publishedDate: '-', views: 0, slug: 'ssc-cgl-admit-card-2026', gradientFrom: '#4a148c', gradientTo: '#6a1b9a' },
  { id: '15', title: 'UPSC CSE 2025 Answer Key', org: 'UPSC', category: 'Answer Key', postCount: '-', lastDate: '-', status: 'active', tag: 'new', publishedDate: '21 Mar 2026', views: 29450, slug: 'upsc-cse-2025-answer-key', gradientFrom: '#004d40', gradientTo: '#00695c' },
  { id: '16', title: 'SSC CHSL Syllabus 2026', org: 'SSC', category: 'Syllabus', postCount: '-', lastDate: '-', status: 'active', tag: 'update', publishedDate: '20 Mar 2026', views: 15670, slug: 'ssc-chsl-syllabus-2026', gradientFrom: '#e65100', gradientTo: '#f57f17' },
];

const ROUTE_CATEGORY: Record<string, PostCategory> = {
  job: 'Latest Jobs',
  result: 'Results',
  'admit-card': 'Admit Card',
  'answer-key': 'Answer Key',
  syllabus: 'Syllabus',
};

const CATEGORY_ICONS: Record<PostCategory, IconComponent> = {
  'Latest Jobs': Briefcase,
  Results: Trophy,
  'Admit Card': CreditCard,
  'Answer Key': FileText,
  Syllabus: BookOpen,
};

const CATEGORY_COLORS: Record<PostCategory, { text: string; bg: string; border: string }> = {
  'Latest Jobs': { text: '#e65100', bg: '#fff4ef', border: '#ffd9c4' },
  Results: { text: '#2e7d32', bg: '#f0fff4', border: '#b9f5c4' },
  'Admit Card': { text: '#6a1b9a', bg: '#f9f0ff', border: '#e4c8ff' },
  'Answer Key': { text: '#00695c', bg: '#f0fffe', border: '#a5f3e8' },
  Syllabus: { text: '#f57f17', bg: '#fffbef', border: '#ffe8a0' },
};

const STATUS_CONFIG: Record<PostStatus, { label: string; color: string; bg: string; icon: IconComponent }> = {
  active: { label: 'Active', color: '#2e7d32', bg: '#f0fff4', icon: CheckCircle },
  draft: { label: 'Draft', color: '#f57f17', bg: '#fffbef', icon: ChevronDown },
  scheduled: { label: 'Scheduled', color: '#1565c0', bg: '#eff4ff', icon: ChevronUp },
  expired: { label: 'Expired', color: '#c62828', bg: '#fff0f0', icon: AlertCircle },
};

const TAG_LABELS: Record<PostTag, string> = { hot: 'HOT', new: 'NEW', update: 'UPDATE', 'last-date': 'LAST DATE', none: '-' };

export function AnnouncementsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCategory = searchParams.get('type') ? ROUTE_CATEGORY[searchParams.get('type')!] : undefined;

  const [posts, setPosts] = useState(POSTS);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<PostCategory | 'all'>(presetCategory ?? 'all');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [tagFilter, setTagFilter] = useState<PostTag | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<BulkAction>('');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const pageSize = 10;

  useEffect(() => {
    setCategoryFilter(presetCategory ?? 'all');
    setPage(1);
  }, [presetCategory]);

  const filtered = useMemo(() => {
    let data = [...posts];
    if (categoryFilter !== 'all') data = data.filter(post => post.category === categoryFilter);
    if (statusFilter !== 'all') data = data.filter(post => post.status === statusFilter);
    if (tagFilter !== 'all') data = data.filter(post => post.tag === tagFilter);
    if (search) {
      const q = search.toLowerCase();
      data = data.filter(post => post.title.toLowerCase().includes(q) || post.org.toLowerCase().includes(q));
    }
    data.sort((left, right) => {
      const l = sortBy === 'views' ? left.views : sortBy === 'title' ? left.title : left.publishedDate;
      const r = sortBy === 'views' ? right.views : sortBy === 'title' ? right.title : right.publishedDate;
      const cmp = typeof l === 'number' && typeof r === 'number' ? l - r : String(l).localeCompare(String(r));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return data;
  }, [categoryFilter, posts, search, sortBy, sortDir, statusFilter, tagFilter]);

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filtered.length / pageSize);
  const allPageSelected = paginated.length > 0 && paginated.every(post => selected.has(post.id));
  const stats = {
    total: posts.length,
    active: posts.filter(post => post.status === 'active').length,
    draft: posts.filter(post => post.status === 'draft').length,
    expired: posts.filter(post => post.status === 'expired').length,
  };

  function toggleSelect(id: string) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(current => {
      const next = new Set(current);
      if (allPageSelected) paginated.forEach(post => next.delete(post.id));
      else paginated.forEach(post => next.add(post.id));
      return next;
    });
  }

  function onSort(field: SortField) {
    if (sortBy === field) setSortDir(current => (current === 'asc' ? 'desc' : 'asc'));
    else {
      setSortBy(field);
      setSortDir('desc');
    }
  }

  function reset() {
    setSearch('');
    setCategoryFilter(presetCategory ?? 'all');
    setStatusFilter('all');
    setTagFilter('all');
    setSortBy('date');
    setSortDir('desc');
    setPage(1);
  }

  function applyBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    if (bulkAction === 'delete') {
      setPosts(current => current.filter(post => !selected.has(post.id)));
      toast.success(`${selected.size} posts deleted.`);
    } else {
      const nextStatus = bulkAction === 'publish' ? 'active' : 'draft';
      setPosts(current => current.map(post => (selected.has(post.id) ? { ...post, status: nextStatus } : post)));
      toast.success(`${selected.size} posts updated.`);
    }
    setSelected(new Set());
    setBulkAction('');
  }

  function deletePost(id: string) {
    setPosts(current => current.filter(post => post.id !== id));
    setSelected(current => {
      const next = new Set(current);
      next.delete(id);
      return next;
    });
    setDeleteId(null);
    toast.success('Post deleted.');
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortBy !== field) return <ChevronDown size={11} className="opacity-30" />;
    return sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-800">Content Manager</h2>
          <p className="text-[11px] text-gray-400">{filtered.length} posts · {stats.active} active · {stats.draft} drafts</p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/announcements/new')}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shadow-md transition-all hover:opacity-90 active:scale-95"
          style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 14px rgba(230,81,0,0.3)' }}
        >
          <Plus size={15} /> New Post
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: 'Total Posts', value: stats.total, color: '#1565c0', bg: '#eff4ff' },
          { label: 'Published', value: stats.active, color: '#2e7d32', bg: '#f0fff4' },
          { label: 'Drafts', value: stats.draft, color: '#f57f17', bg: '#fffbef' },
          { label: 'Expired', value: stats.expired, color: '#c62828', bg: '#fff0f0' },
        ].map(item => (
          <div key={item.label} className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: item.bg }}>
              <span className="text-[15px] font-extrabold" style={{ color: item.color }}>{item.value}</span>
            </div>
            <span className="text-[11px] font-semibold text-gray-500">{item.label}</span>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="flex min-w-44 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Search size={14} className="shrink-0 text-gray-400" />
            <input value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search by title, org..." className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400" />
          </div>
          {!presetCategory && (
            <select value={categoryFilter} onChange={event => { setCategoryFilter(event.target.value as PostCategory | 'all'); setPage(1); }} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none">
              <option value="all">All Categories</option>
              {Object.values(ROUTE_CATEGORY).map(category => <option key={category} value={category}>{category}</option>)}
            </select>
          )}
          <select value={statusFilter} onChange={event => { setStatusFilter(event.target.value as PostStatus | 'all'); setPage(1); }} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
          </select>
          <select value={tagFilter} onChange={event => { setTagFilter(event.target.value as PostTag | 'all'); setPage(1); }} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none">
            <option value="all">All Tags</option>
            <option value="hot">HOT</option>
            <option value="new">NEW</option>
            <option value="update">UPDATE</option>
            <option value="last-date">LAST DATE</option>
            <option value="none">No Tag</option>
          </select>
          <div className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
            <Filter size={12} className="text-gray-400" />
            <select value={sortBy} onChange={event => setSortBy(event.target.value as SortField)} className="bg-transparent text-[12px] font-semibold text-gray-700 outline-none">
              <option value="date">Sort: Date</option>
              <option value="views">Sort: Views</option>
              <option value="title">Sort: Title</option>
            </select>
          </div>
          <button type="button" onClick={reset} className="rounded-xl border border-gray-200 p-2.5 text-gray-500 transition-colors hover:bg-gray-100">
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {selected.size > 0 && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 border-orange-200 bg-white p-3 shadow-sm">
            <span className="rounded-lg bg-orange-100 px-3 py-1.5 text-[12px] font-bold text-orange-700">{selected.size} selected</span>
            <select value={bulkAction} onChange={event => setBulkAction(event.target.value as BulkAction)} className="rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-700 outline-none">
              <option value="">Bulk Action...</option>
              <option value="publish">Publish All</option>
              <option value="draft">Move to Draft</option>
              <option value="delete">Delete All</option>
            </select>
            <button type="button" onClick={applyBulkAction} disabled={!bulkAction} className="rounded-xl px-4 py-2 text-[12px] font-bold text-white transition-all disabled:opacity-40" style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)' }}>
              Apply
            </button>
            <button type="button" onClick={() => setSelected(new Set())} className="ml-auto text-gray-400 transition-colors hover:text-gray-600">Clear</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: 'linear-gradient(90deg, #f8f9ff 0%, #f0f4ff 100%)', borderBottom: '1.5px solid #e8ecf8' }}>
                <th className="w-8 py-3 pl-4 pr-2">
                  <button type="button" onClick={toggleAll} className="text-gray-400 transition-colors hover:text-orange-500">
                    {allPageSelected ? <CheckSquare size={15} className="text-orange-500" /> : <Square size={15} />}
                  </button>
                </th>
                <th className="px-4 py-3 text-left">
                  <button type="button" onClick={() => onSort('title')} className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 transition-colors hover:text-gray-800">
                    Post <SortIcon field="title" />
                  </button>
                </th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Category</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Status</th>
                <th className="px-3 py-3 text-left text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Tag</th>
                <th className="px-3 py-3 text-right">
                  <button type="button" onClick={() => onSort('views')} className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500 transition-colors hover:text-gray-800">
                    Views <SortIcon field="views" />
                  </button>
                </th>
                <th className="px-3 py-3 text-right text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center"><Search size={32} className="mx-auto mb-3 text-gray-200" /><p className="text-[13px] text-gray-400">No posts match your filters.</p></td></tr>
              )}
              {paginated.map((post, index) => {
                const categoryTone = CATEGORY_COLORS[post.category];
                const CategoryIcon = CATEGORY_ICONS[post.category];
                const statusTone = STATUS_CONFIG[post.status];
                const StatusIcon = statusTone.icon;
                const isSelected = selected.has(post.id);
                return (
                  <tr key={post.id} className={cn('border-b border-gray-50 transition-colors hover:bg-orange-50/20', isSelected ? 'bg-orange-50/40' : index % 2 === 1 ? 'bg-gray-50/20' : '')}>
                    <td className="py-3 pl-4 pr-2">
                      <button type="button" onClick={() => toggleSelect(post.id)} className="text-gray-400 transition-colors hover:text-orange-500">
                        {isSelected ? <CheckSquare size={15} className="text-orange-500" /> : <Square size={15} />}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg" style={{ background: `linear-gradient(135deg, ${post.gradientFrom}, ${post.gradientTo})` }}>
                          <span className="text-[8px] font-extrabold text-white">{post.org.split(' ').map(word => word[0]).join('').slice(0, 3)}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="max-w-[300px] truncate text-[13px] font-semibold text-gray-800">{post.title}</p>
                          <p className="text-[10px] text-gray-400">{post.org} · {post.publishedDate} {post.postCount !== '-' ? `· ${post.postCount} posts` : ''}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: categoryTone.bg, border: `1px solid ${categoryTone.border}`, color: categoryTone.text }}>
                        <CategoryIcon className="h-2.5 w-2.5" /> {post.category}
                      </span>
                    </td>
                    <td className="px-3 py-3.5">
                      <span className="flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ background: statusTone.bg, color: statusTone.color }}>
                        <StatusIcon className="h-2.5 w-2.5" /> {statusTone.label}
                      </span>
                    </td>
                    <td className="px-3 py-3.5"><span className="text-[11px] text-gray-600">{TAG_LABELS[post.tag]}</span></td>
                    <td className="px-3 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Eye className="h-3 w-3 text-gray-400" />
                        <span className="text-[12px] font-bold text-gray-700">{post.views.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link href={`/detail/${post.slug}`} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-gray-50 p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700" title="View on site">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                        <button type="button" onClick={() => router.push(`/announcements/${post.id}`)} className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100" title="Edit">
                          <ArrowUpRight className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => setDeleteId(post.id)} className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-4 py-3.5">
            <span className="text-[11px] text-gray-400">{(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filtered.length)} of {filtered.length} posts</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setPage(current => Math.max(1, current - 1))} disabled={page === 1} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-500 transition-all hover:bg-gray-100 disabled:opacity-40">Prev</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, index) => index + 1).map(number => (
                <button key={number} type="button" onClick={() => setPage(number)} className={cn('h-8 w-8 rounded-lg text-[12px] font-bold transition-all', page === number ? 'text-white' : 'text-gray-500 hover:bg-gray-100')} style={page === number ? { background: 'linear-gradient(135deg, #e65100, #bf360c)' } : undefined}>{number}</button>
              ))}
              <button type="button" onClick={() => setPage(current => Math.min(totalPages, current + 1))} disabled={page === totalPages} className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] text-gray-500 transition-all hover:bg-gray-100 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {deleteId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(10,20,60,0.55)] p-4 backdrop-blur-[4px]">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100"><Trash2 className="h-6 w-6 text-red-500" /></div>
              <h3 className="mb-1 text-[16px] font-extrabold text-gray-800">Delete this post?</h3>
              <p className="mb-5 text-[13px] text-gray-500">This action cannot be undone. The post and all its data will be permanently removed.</p>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeleteId(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-50">Cancel</button>
                <button type="button" onClick={() => deletePost(deleteId)} className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white" style={{ background: 'linear-gradient(135deg, #c62828, #b71c1c)' }}>Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
