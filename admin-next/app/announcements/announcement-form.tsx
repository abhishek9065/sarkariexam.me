'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Briefcase, Calendar, CheckCircle, Eye, FileText, Globe, Info, Link2, Plus, RotateCcw, Save, Sparkles, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { createAnnouncement, getAdminAnnouncement, updateAnnouncement } from '@/lib/api';
import type { Announcement, AnnouncementStatus, ContentType, ImportantDate } from '@/lib/types';
import { RoleGuard } from '@/components/role-guard';

interface AnnouncementFormProps { id?: string }
type EditorStatus = 'active' | 'draft' | 'scheduled' | 'expired';
type EditorCategory = 'Latest Jobs' | 'Results' | 'Admit Card' | 'Answer Key' | 'Syllabus';
type EditorTag = 'hot' | 'new' | 'update' | 'last-date' | 'none';
type LinkType = 'apply' | 'download' | 'website' | 'disabled';
type DateStatus = 'done' | 'active' | 'upcoming';
type VacancyRow = { post: string; dept: string; vacancies: string; payLevel: string; salary: string };
type LinkRow = { label: string; url: string; type: LinkType };
type DateRow = { event: string; date: string; status: DateStatus };

type PostData = {
  id?: string;
  title: string;
  org: string;
  orgShort: string;
  category: EditorCategory;
  tag: EditorTag;
  status: EditorStatus;
  postCount: string;
  lastDate: string;
  applicationStartDate: string;
  examDate: string;
  scheduledDate: string;
  qualification: string;
  ageLimit: string;
  salary: string;
  location: string;
  description: string;
  applicationFee: { gen: string; obc: string; scst: string; female: string; exsm: string };
  applicationFeeNote: string;
  selectionProcess: string[];
  eligibility: { education: string; age: string; nationality: string; physicalStandards: string };
  vacancyBreakdown: VacancyRow[];
  importantLinks: LinkRow[];
  importantDates: DateRow[];
  color: string;
  gradientFrom: string;
  gradientTo: string;
  metaTitle: string;
  metaDesc: string;
  slug: string;
};

const EMPTY_POST: PostData = {
  title: '', org: '', orgShort: '', category: 'Latest Jobs', tag: 'new', status: 'draft',
  postCount: '', lastDate: '', applicationStartDate: '', examDate: '', scheduledDate: '',
  qualification: '', ageLimit: '', salary: '', location: 'All India', description: '',
  applicationFee: { gen: '₹100', obc: '₹100', scst: '₹0', female: '₹0', exsm: '₹0' },
  applicationFeeNote: 'Online Payment / SBI Cash Challan',
  selectionProcess: ['Written Exam', 'Document Verification'],
  eligibility: { education: '', age: '', nationality: 'Indian Citizen', physicalStandards: '' },
  vacancyBreakdown: [{ post: '', dept: '', vacancies: '', payLevel: '', salary: '' }],
  importantLinks: [{ label: 'Apply Online', url: '#', type: 'apply' }],
  importantDates: [{ event: 'Application Begin', date: '', status: 'done' }, { event: 'Last Date to Apply', date: '', status: 'active' }],
  color: '#e65100', gradientFrom: '#1a237e', gradientTo: '#283593', metaTitle: '', metaDesc: '', slug: '',
};

const TABS = [
  { id: 'basic', label: 'Basic Info', icon: Info },
  { id: 'dates', label: 'Dates & Timeline', icon: Calendar },
  { id: 'content', label: 'Description', icon: FileText },
  { id: 'eligibility', label: 'Eligibility & Fee', icon: Users },
  { id: 'vacancy', label: 'Vacancy Breakdown', icon: Briefcase },
  { id: 'links', label: 'Important Links', icon: Link2 },
  { id: 'seo', label: 'SEO & Appearance', icon: Globe },
] as const;

const GRADIENTS = [
  { label: 'Navy Blue', from: '#1a237e', to: '#283593', color: '#e65100' },
  { label: 'Deep Red', from: '#b71c1c', to: '#c62828', color: '#c62828' },
  { label: 'Dark Green', from: '#1b5e20', to: '#2e7d32', color: '#2e7d32' },
  { label: 'Dark Purple', from: '#4a148c', to: '#6a1b9a', color: '#6a1b9a' },
  { label: 'Deep Teal', from: '#004d40', to: '#00695c', color: '#00695c' },
  { label: 'Midnight', from: '#212121', to: '#37474f', color: '#e65100' },
];

const CATEGORY_OPTIONS: EditorCategory[] = ['Latest Jobs', 'Results', 'Admit Card', 'Answer Key', 'Syllabus'];
const STATUS_OPTIONS = [
  { value: 'active', label: 'Active / Published', color: '#2e7d32' },
  { value: 'draft', label: 'Draft', color: '#f57f17' },
  { value: 'scheduled', label: 'Scheduled', color: '#1565c0' },
  { value: 'expired', label: 'Expired', color: '#c62828' },
] as const;

const labelClass = 'mb-1.5 block text-[10px] font-bold uppercase tracking-[0.07em] text-gray-600';
const inputClass = 'w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-orange-400 focus:ring-2 focus:ring-orange-100';

const typeToCategory = (type?: ContentType): EditorCategory => type === 'result' ? 'Results' : type === 'admit-card' ? 'Admit Card' : type === 'answer-key' ? 'Answer Key' : type === 'syllabus' ? 'Syllabus' : 'Latest Jobs';
const categoryToType = (category: EditorCategory): ContentType => category === 'Results' ? 'result' : category === 'Admit Card' ? 'admit-card' : category === 'Answer Key' ? 'answer-key' : category === 'Syllabus' ? 'syllabus' : 'job';
const statusToEditor = (status?: AnnouncementStatus): EditorStatus => status === 'published' ? 'active' : status === 'scheduled' ? 'scheduled' : status === 'archived' ? 'expired' : 'draft';
const editorToStatus = (status: EditorStatus): AnnouncementStatus => status === 'active' ? 'published' : status === 'scheduled' ? 'scheduled' : status === 'expired' ? 'archived' : 'draft';
const parseNumber = (value: string) => { const num = Number(value.replace(/[^0-9.]/g, '')); return Number.isFinite(num) && num > 0 ? num : undefined; };

function fromAnnouncement(data: Announcement): PostData {
  const job = (data.jobDetails || {}) as Record<string, unknown>;
  const fee = (job.applicationFee || {}) as Record<string, string>;
  const eligibility = (job.eligibility || {}) as Record<string, string>;
  return {
    id: data.id,
    title: data.title || '',
    org: data.organization || '',
    orgShort: String(job.orgShort || ''),
    category: typeToCategory(data.type),
    tag: (job.tag as EditorTag) || 'new',
    status: statusToEditor(data.status),
    postCount: data.totalPosts?.toString() || '',
    lastDate: data.deadline || '',
    applicationStartDate: String(job.applicationStartDate || ''),
    examDate: String(job.examDate || ''),
    scheduledDate: String(job.scheduledDate || data.publishAt || ''),
    qualification: data.minQualification || '',
    ageLimit: data.ageLimit || '',
    salary: String(job.salary || ''),
    location: data.location || 'All India',
    description: data.content || '',
    applicationFee: { gen: fee.gen || '₹100', obc: fee.obc || '₹100', scst: fee.scst || '₹0', female: fee.female || '₹0', exsm: fee.exsm || '₹0' },
    applicationFeeNote: String(job.applicationFeeNote || data.applicationFee || 'Online Payment / SBI Cash Challan'),
    selectionProcess: Array.isArray(job.selectionProcess) ? job.selectionProcess as string[] : EMPTY_POST.selectionProcess,
    eligibility: { education: eligibility.education || '', age: eligibility.age || '', nationality: eligibility.nationality || 'Indian Citizen', physicalStandards: eligibility.physicalStandards || '' },
    vacancyBreakdown: Array.isArray(job.vacancyBreakdown) && job.vacancyBreakdown.length ? job.vacancyBreakdown as VacancyRow[] : EMPTY_POST.vacancyBreakdown,
    importantLinks: Array.isArray(job.importantLinks) && job.importantLinks.length ? job.importantLinks as LinkRow[] : EMPTY_POST.importantLinks,
    importantDates: Array.isArray(job.importantDates) && job.importantDates.length ? job.importantDates as DateRow[] : (data.importantDates || []).map((item: ImportantDate) => ({ event: item.eventName, date: item.eventDate, status: 'upcoming' as DateStatus })),
    color: String(job.color || '#e65100'),
    gradientFrom: String(job.gradientFrom || '#1a237e'),
    gradientTo: String(job.gradientTo || '#283593'),
    metaTitle: data.seo?.metaTitle || '',
    metaDesc: data.seo?.metaDescription || '',
    slug: data.slug || '',
  };
}

export function AnnouncementForm({ id }: AnnouncementFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);
  const [post, setPost] = useState<PostData>(EMPTY_POST);
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['id']>('basic');
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: existing, isLoading } = useQuery({
    queryKey: ['admin-announcement', id],
    queryFn: () => getAdminAnnouncement(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing?.data) {
      setPost(fromAnnouncement(existing.data));
      setDirty(false);
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async (next?: EditorStatus) => {
      const status = next ?? post.status;
      const payload: Partial<Announcement> = {
        title: post.title,
        type: categoryToType(post.category),
        category: post.category,
        organization: post.org,
        content: post.description,
        status: editorToStatus(status),
        location: post.location || undefined,
        deadline: post.lastDate || undefined,
        minQualification: post.qualification || undefined,
        ageLimit: post.ageLimit || undefined,
        applicationFee: post.applicationFeeNote || undefined,
        totalPosts: parseNumber(post.postCount),
        externalLink: post.importantLinks.find(item => item.type === 'apply')?.url || undefined,
        publishAt: status === 'scheduled' ? post.scheduledDate || undefined : undefined,
        importantDates: post.importantDates.filter(item => item.event || item.date).map(item => ({ eventName: item.event, eventDate: item.date, description: item.status })),
        seo: { metaTitle: post.metaTitle || undefined, metaDescription: post.metaDesc || undefined },
        jobDetails: {
          orgShort: post.orgShort, tag: post.tag, applicationStartDate: post.applicationStartDate, examDate: post.examDate, scheduledDate: post.scheduledDate,
          salary: post.salary, applicationFee: post.applicationFee, applicationFeeNote: post.applicationFeeNote, selectionProcess: post.selectionProcess,
          eligibility: post.eligibility, vacancyBreakdown: post.vacancyBreakdown, importantLinks: post.importantLinks, importantDates: post.importantDates,
          color: post.color, gradientFrom: post.gradientFrom, gradientTo: post.gradientTo,
        },
      };
      return isEdit ? updateAnnouncement(id!, payload) : createAnnouncement(payload);
    },
    onSuccess: (_, next) => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      queryClient.invalidateQueries({ queryKey: ['admin-announcement', id] });
      setDirty(false);
      toast.success(next === 'active' ? 'Post published successfully!' : 'Draft saved!');
      router.push('/announcements');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save'),
  });

  const update = <K extends keyof PostData>(key: K, value: PostData[K]) => { setPost(current => ({ ...current, [key]: value })); setDirty(true); };
  const updateFee = (key: keyof PostData['applicationFee'], value: string) => { setPost(current => ({ ...current, applicationFee: { ...current.applicationFee, [key]: value } })); setDirty(true); };
  const updateEligibility = (key: keyof PostData['eligibility'], value: string) => { setPost(current => ({ ...current, eligibility: { ...current.eligibility, [key]: value } })); setDirty(true); };

  if (isEdit && isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="h-9 w-9 animate-spin rounded-full border-2 border-[#e65100]/30 border-t-[#e65100]" /></div>;
  }

  const statusColor = STATUS_OPTIONS.find(item => item.value === post.status)?.color ?? '#9ca3af';

  return (
    <div className="flex min-h-[calc(100vh-9rem)] flex-col overflow-hidden rounded-[28px] border border-gray-100 bg-[#f7f7fb] shadow-sm">
      <div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-5 py-3 shadow-sm">
        <button type="button" onClick={() => router.push('/announcements')} className="rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">
          <ArrowLeft size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[15px] font-extrabold text-gray-800">{post.title || (isEdit ? 'Edit Post' : 'New Post')}</h1>
            {dirty && <span className="h-2 w-2 animate-pulse rounded-full bg-orange-400" />}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="rounded-full px-2 py-0.5 text-[9px] font-extrabold" style={{ background: `${statusColor}18`, color: statusColor }}>
              {STATUS_OPTIONS.find(item => item.value === post.status)?.label}
            </span>
            {post.slug && <span className="text-[10px] text-gray-400">/detail/{post.slug}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowPreview(true)} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">
            <Eye size={13} /> Preview
          </button>
          <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate('draft')} className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <Save size={13} /> Save Draft
          </button>
          <RoleGuard allowedRoles={['superadmin', 'reviewer']}>
            <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate('active')} className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 12px rgba(230,81,0,0.3)' }}>
              <ArrowRight size={14} /> Publish
            </button>
          </RoleGuard>
        </div>
      </div>

      <div className="shrink-0 border-b border-gray-100 bg-white px-5">
        <div className="flex overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} type="button" onClick={() => setActiveTab(tab.id)} className={`border-b-2 px-4 py-3 text-[12.5px] transition-all ${isActive ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`} style={{ fontWeight: isActive ? 700 : 500 }}>
                <span className="flex items-center gap-2 whitespace-nowrap"><Icon size={13} />{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {activeTab === 'basic' && (
          <div className="max-w-3xl space-y-5">
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Post Identity</h3>
              <div>
                <label className={labelClass}>Post Title</label>
                <input value={post.title} onChange={event => update('title', event.target.value)} placeholder="e.g. SSC CGL 2026 - Combined Graduate Level Examination" className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className={labelClass}>Organization (Full Name)</label>
                  <input value={post.org} onChange={event => update('org', event.target.value)} placeholder="e.g. Staff Selection Commission" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Organization Short Name</label>
                  <input value={post.orgShort} onChange={event => update('orgShort', event.target.value)} placeholder="e.g. SSC" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className={labelClass}>Category</label>
                  <select value={post.category} onChange={event => update('category', event.target.value as EditorCategory)} className={inputClass}>
                    {CATEGORY_OPTIONS.map(item => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Tag / Badge</label>
                  <select value={post.tag} onChange={event => update('tag', event.target.value as EditorTag)} className={inputClass}>
                    <option value="hot">HOT</option><option value="new">NEW</option><option value="update">UPDATE</option><option value="last-date">LAST DATE</option><option value="none">No Tag</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={post.status} onChange={event => update('status', event.target.value as EditorStatus)} className={inputClass}>
                    {STATUS_OPTIONS.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Key Details</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className={labelClass}>Total Posts / Vacancies</label><input value={post.postCount} onChange={event => update('postCount', event.target.value)} placeholder="e.g. 14,582" className={inputClass} /></div>
                <div><label className={labelClass}>Location</label><input value={post.location} onChange={event => update('location', event.target.value)} placeholder="e.g. All India" className={inputClass} /></div>
                <div><label className={labelClass}>Qualification</label><input value={post.qualification} onChange={event => update('qualification', event.target.value)} placeholder="e.g. Graduate (Any Discipline)" className={inputClass} /></div>
                <div><label className={labelClass}>Age Limit</label><input value={post.ageLimit} onChange={event => update('ageLimit', event.target.value)} placeholder="e.g. 18 - 32 years" className={inputClass} /></div>
                <div className="md:col-span-2"><label className={labelClass}>Salary / Pay Scale</label><input value={post.salary} onChange={event => update('salary', event.target.value)} placeholder="e.g. ₹25,500 - ₹81,100 + DA" className={inputClass} /></div>
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Selection Process</h3>
                <button type="button" onClick={() => update('selectionProcess', [...post.selectionProcess, ''])} className="flex items-center gap-1.5 rounded-lg bg-orange-50 px-3 py-1.5 text-[11px] font-semibold text-orange-600 hover:bg-orange-100"><Plus size={12} /> Add Stage</button>
              </div>
              {post.selectionProcess.map((item, index) => (
                <div key={`${item}-${index}`} className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[10px] font-extrabold text-orange-600">{index + 1}</div>
                  <input value={item} onChange={event => { const next = [...post.selectionProcess]; next[index] = event.target.value; update('selectionProcess', next); }} placeholder={`Stage ${index + 1}`} className={inputClass} />
                  {post.selectionProcess.length > 1 && <button type="button" onClick={() => update('selectionProcess', post.selectionProcess.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'dates' && (
          <div className="max-w-3xl space-y-5">
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Key Dates</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div><label className={labelClass}>Application Start Date</label><input value={post.applicationStartDate} onChange={event => update('applicationStartDate', event.target.value)} placeholder="e.g. 01 Mar 2026" className={inputClass} /></div>
                <div><label className={labelClass}>Last Date to Apply</label><input value={post.lastDate} onChange={event => update('lastDate', event.target.value)} placeholder="e.g. 30 Apr 2026" className={inputClass} /></div>
                <div><label className={labelClass}>Exam Date</label><input value={post.examDate} onChange={event => update('examDate', event.target.value)} placeholder="e.g. July - August 2026" className={inputClass} /></div>
                {post.status === 'scheduled' && <div><label className={labelClass}>Scheduled Publish Date</label><input value={post.scheduledDate} onChange={event => update('scheduledDate', event.target.value)} type="datetime-local" className={inputClass} /></div>}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Important Dates Timeline</h3>
                  <p className="mt-0.5 text-[10px] text-gray-400">These appear in the timeline section on the detail page.</p>
                </div>
                <button type="button" onClick={() => update('importantDates', [...post.importantDates, { event: '', date: '', status: 'upcoming' }])} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-100"><Plus size={12} /> Add Row</button>
              </div>
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full">
                  <thead><tr style={{ background: 'linear-gradient(90deg, #f8f9ff, #f0f4ff)' }}><th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] text-gray-500">Event</th><th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] text-gray-500">Date</th><th className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] text-gray-500">Status</th><th className="px-3 py-2.5" /></tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {post.importantDates.map((item, index) => (
                      <tr key={`${item.event}-${index}`}>
                        <td className="px-2 py-2"><input value={item.event} onChange={event => { const next = [...post.importantDates]; next[index] = { ...next[index], event: event.target.value }; update('importantDates', next); }} placeholder="Application Begin" className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-orange-400" /></td>
                        <td className="px-2 py-2"><input value={item.date} onChange={event => { const next = [...post.importantDates]; next[index] = { ...next[index], date: event.target.value }; update('importantDates', next); }} placeholder="01 Mar 2026" className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-orange-400" /></td>
                        <td className="px-2 py-2"><select value={item.status} onChange={event => { const next = [...post.importantDates]; next[index] = { ...next[index], status: event.target.value as DateStatus }; update('importantDates', next); }} className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-orange-400"><option value="done">Done</option><option value="active">Active</option><option value="upcoming">Upcoming</option></select></td>
                        <td className="px-2 py-2">{post.importantDates.length > 1 && <button type="button" onClick={() => update('importantDates', post.importantDates.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'content' && (
          <div className="max-w-3xl space-y-5">
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Post Description</h3>
                  <p className="mt-0.5 text-[10px] text-gray-400">This appears in the overview section on the detail page.</p>
                </div>
                <span className="text-[11px] text-gray-400">{post.description.length} chars</span>
              </div>
              <textarea value={post.description} onChange={event => update('description', event.target.value)} rows={10} placeholder="Write a comprehensive description of this recruitment / result / admit card." className={`${inputClass} resize-none px-4 py-3 leading-[1.7]`} />
              <div className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2.5"><Info size={13} className="text-blue-500" /><p className="text-[11px] text-blue-700">Tip: Write at least 200 characters for better SEO. Use clear, factual language.</p></div>
            </div>
          </div>
        )}

        {activeTab === 'eligibility' && (
          <div className="max-w-3xl space-y-5">
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Eligibility Criteria</h3>
              <div><label className={labelClass}>Educational Qualification</label><textarea value={post.eligibility.education} onChange={event => updateEligibility('education', event.target.value)} rows={3} className={`${inputClass} resize-none`} /></div>
              <div><label className={labelClass}>Age Limit (Detailed)</label><textarea value={post.eligibility.age} onChange={event => updateEligibility('age', event.target.value)} rows={2} className={`${inputClass} resize-none`} /></div>
              <div><label className={labelClass}>Nationality</label><input value={post.eligibility.nationality} onChange={event => updateEligibility('nationality', event.target.value)} className={inputClass} /></div>
              <div><label className={labelClass}>Physical Standards</label><textarea value={post.eligibility.physicalStandards} onChange={event => updateEligibility('physicalStandards', event.target.value)} rows={2} className={`${inputClass} resize-none`} /></div>
            </div>
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Application Fee</h3>
              <div className="overflow-hidden rounded-xl border border-gray-100">
                <table className="w-full">
                  <thead><tr style={{ background: 'linear-gradient(90deg, #f8f9ff, #f0f4ff)' }}>{['General', 'OBC', 'SC / ST', 'Female', 'Ex-Servicemen'].map(item => <th key={item} className="px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] text-gray-500">{item}</th>)}</tr></thead>
                  <tbody><tr>{(['gen', 'obc', 'scst', 'female', 'exsm'] as const).map(key => <td key={key} className="px-2 py-3"><input value={post.applicationFee[key]} onChange={event => updateFee(key, event.target.value)} className="w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-orange-400" /></td>)}</tr></tbody>
                </table>
              </div>
              <div><label className={labelClass}>Fee Note / Payment Method</label><input value={post.applicationFeeNote} onChange={event => update('applicationFeeNote', event.target.value)} className={inputClass} /></div>
            </div>
          </div>
        )}

        {activeTab === 'vacancy' && (
          <div className="max-w-4xl space-y-5">
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Vacancy / Post Breakdown</h3>
                  <p className="mt-0.5 text-[10px] text-gray-400">Detailed vacancy rows for the post detail page.</p>
                </div>
                <button type="button" onClick={() => update('vacancyBreakdown', [...post.vacancyBreakdown, { post: '', dept: '', vacancies: '', payLevel: '', salary: '' }])} className="flex items-center gap-1.5 rounded-lg bg-blue-50 px-3 py-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-100"><Plus size={12} /> Add Row</button>
              </div>
              <div className="overflow-x-auto rounded-xl border border-gray-100">
                <table className="w-full">
                  <thead><tr style={{ background: 'linear-gradient(90deg, #f8f9ff, #f0f4ff)' }}>{['Post / Designation', 'Department', 'Vacancies', 'Pay Level', 'Salary Range', ''].map(item => <th key={item} className="whitespace-nowrap px-3 py-2.5 text-left text-[10px] font-bold uppercase tracking-[0.07em] text-gray-500">{item}</th>)}</tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {post.vacancyBreakdown.map((item, index) => (
                      <tr key={`${item.post}-${index}`}>
                        {(['post', 'dept', 'vacancies', 'payLevel', 'salary'] as const).map(key => <td key={key} className="px-2 py-2"><input value={item[key]} onChange={event => { const next = [...post.vacancyBreakdown]; next[index] = { ...next[index], [key]: event.target.value }; update('vacancyBreakdown', next); }} className="min-w-[100px] w-full rounded-lg border border-gray-200 px-2.5 py-1.5 text-[12px] outline-none focus:border-orange-400" /></td>)}
                        <td className="px-2 py-2">{post.vacancyBreakdown.length > 1 && <button type="button" onClick={() => update('vacancyBreakdown', post.vacancyBreakdown.filter((_, itemIndex) => itemIndex !== index))} className="rounded-lg p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={12} /></button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="max-w-3xl space-y-5">
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Important Links</h3>
                  <p className="mt-0.5 text-[10px] text-gray-400">Apply links, PDFs, official sites, admit cards and more.</p>
                </div>
                <button type="button" onClick={() => update('importantLinks', [...post.importantLinks, { label: '', url: '#', type: 'apply' }])} className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-[11px] font-semibold text-green-600 hover:bg-green-100"><Plus size={12} /> Add Link</button>
              </div>
              <div className="space-y-3">
                {post.importantLinks.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="flex items-start gap-2 rounded-xl border border-gray-100 bg-gray-50/50 p-3.5">
                    <div className="grid flex-1 grid-cols-1 gap-2.5 sm:grid-cols-3">
                      <div><label className="mb-1 block text-[10px] font-semibold text-gray-500">Label</label><input value={item.label} onChange={event => { const next = [...post.importantLinks]; next[index] = { ...next[index], label: event.target.value }; update('importantLinks', next); }} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-orange-400" /></div>
                      <div><label className="mb-1 block text-[10px] font-semibold text-gray-500">URL</label><input value={item.url} onChange={event => { const next = [...post.importantLinks]; next[index] = { ...next[index], url: event.target.value }; update('importantLinks', next); }} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-orange-400" /></div>
                      <div><label className="mb-1 block text-[10px] font-semibold text-gray-500">Button Type</label><select value={item.type} onChange={event => { const next = [...post.importantLinks]; next[index] = { ...next[index], type: event.target.value as LinkType }; update('importantLinks', next); }} className="w-full rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-[12px] outline-none focus:border-orange-400"><option value="apply">Apply (Green)</option><option value="download">Download (Blue)</option><option value="website">Website (Dark)</option><option value="disabled">Coming Soon (Gray)</option></select></div>
                    </div>
                    <button type="button" onClick={() => update('importantLinks', post.importantLinks.filter((_, itemIndex) => itemIndex !== index))} className="mt-5 rounded-lg p-2 text-red-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={13} /></button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="max-w-3xl space-y-5">
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">URL Slug</h3>
                <button type="button" onClick={() => { const slug = post.title.toLowerCase().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 60); update('slug', slug); toast.success('Slug auto-generated!'); }} className="flex items-center gap-1.5 rounded-lg bg-purple-50 px-3 py-1.5 text-[11px] font-semibold text-purple-600 hover:bg-purple-100"><Sparkles size={12} /> Auto-Generate</button>
              </div>
              <div><label className={labelClass}>URL Slug</label><div className="flex items-center gap-2"><span className="text-[12px] text-gray-400">/detail/</span><input value={post.slug} onChange={event => update('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))} className={inputClass} /></div></div>
            </div>
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">SEO Meta Tags</h3>
                <button type="button" onClick={() => { update('metaTitle', `${post.title} - ${post.org} | SarkariExams.me`); update('metaDesc', `Apply for ${post.title}. Total ${post.postCount || 'multiple'} vacancies. Last date: ${post.lastDate || 'check notification'}.`); toast.success('Meta tags auto-generated!'); }} className="flex items-center gap-1.5 rounded-lg bg-green-50 px-3 py-1.5 text-[11px] font-semibold text-green-600 hover:bg-green-100"><Sparkles size={12} /> Auto-Fill</button>
              </div>
              <div><label className={labelClass}>Meta Title</label><input value={post.metaTitle} onChange={event => update('metaTitle', event.target.value)} className={inputClass} /><p className={`mt-1 text-[10px] ${post.metaTitle.length > 70 ? 'text-red-400' : 'text-gray-400'}`}>{post.metaTitle.length}/70 chars</p></div>
              <div><label className={labelClass}>Meta Description</label><textarea value={post.metaDesc} onChange={event => update('metaDesc', event.target.value)} rows={3} className={`${inputClass} resize-none`} /><p className={`mt-1 text-[10px] ${post.metaDesc.length > 160 ? 'text-red-400' : 'text-gray-400'}`}>{post.metaDesc.length}/160 chars</p></div>
            </div>
            <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-gray-700">Detail Page Appearance</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{GRADIENTS.map(item => <button key={item.label} type="button" onClick={() => { update('gradientFrom', item.from); update('gradientTo', item.to); update('color', item.color); }} className={`rounded-xl p-0.5 ${post.gradientFrom === item.from ? 'scale-105 ring-2 ring-orange-400' : 'hover:scale-105'}`} style={{ background: `linear-gradient(135deg, ${item.from}, ${item.to})`, height: 48 }}><span className="mt-7 block text-center text-[8px] font-bold text-white">{item.label}</span></button>)}</div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className={labelClass}>Accent Color</label><div className="flex items-center gap-2"><input type="color" value={post.color} onChange={event => update('color', event.target.value)} className="h-10 w-10 rounded-lg border border-gray-200" /><input value={post.color} onChange={event => update('color', event.target.value)} className={inputClass} /></div></div>
                <div><label className={labelClass}>Gradient Start</label><div className="flex items-center gap-2"><input type="color" value={post.gradientFrom} onChange={event => update('gradientFrom', event.target.value)} className="h-10 w-10 rounded-lg border border-gray-200" /><input value={post.gradientFrom} onChange={event => update('gradientFrom', event.target.value)} className={inputClass} /></div></div>
                <div><label className={labelClass}>Gradient End</label><div className="flex items-center gap-2"><input type="color" value={post.gradientTo} onChange={event => update('gradientTo', event.target.value)} className="h-10 w-10 rounded-lg border border-gray-200" /><input value={post.gradientTo} onChange={event => update('gradientTo', event.target.value)} className={inputClass} /></div></div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-gray-200 bg-white px-5 py-3">
        <div className="flex items-center gap-2 text-[11px] text-gray-400">{dirty ? <><span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />Unsaved changes</> : <><CheckCircle size={12} className="text-green-500" />All changes saved</>}</div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => { setPost(existing?.data ? fromAnnouncement(existing.data) : EMPTY_POST); setDirty(false); toast.info('Changes discarded.'); }} className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-[12px] font-semibold text-gray-500 hover:bg-gray-100"><RotateCcw size={13} /> Discard</button>
          <RoleGuard
            allowedRoles={['superadmin', 'reviewer']}
            fallback={
              <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate('draft')} className="flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 12px rgba(230,81,0,0.25)' }}><Save size={14} />Save Draft</button>
            }
          >
            <button type="button" disabled={saveMutation.isPending} onClick={() => saveMutation.mutate(post.status)} className="flex items-center gap-2 rounded-xl px-5 py-2 text-[13px] font-bold text-white hover:opacity-90 disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 12px rgba(230,81,0,0.25)' }}><Save size={14} />{post.status === 'active' ? 'Save & Publish' : 'Save Draft'}</button>
          </RoleGuard>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-[28px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div><h3 className="text-[16px] font-extrabold text-gray-800">Preview</h3><p className="text-[11px] text-gray-400">Figma-style detail header preview</p></div>
              <button type="button" onClick={() => setShowPreview(false)} className="rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50">Close</button>
            </div>
            <div className="space-y-5 p-5">
              <div className="overflow-hidden rounded-[24px]" style={{ background: `linear-gradient(135deg, ${post.gradientFrom}, ${post.gradientTo})` }}>
                <div className="px-6 py-6">
                  <div className="mb-3 flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/20 text-[11px] font-extrabold text-white">{post.orgShort || 'ORG'}</span><span className="text-[12px] text-white/75">{post.org || 'Organization'}</span></div>
                  <h4 className="max-w-2xl text-[28px] font-extrabold leading-tight text-white">{post.title || 'Post Title Preview'}</h4>
                  <div className="mt-4 flex flex-wrap items-center gap-3"><span className="rounded-full px-3 py-1 text-[11px] font-bold text-white" style={{ background: post.color }}>{post.tag.toUpperCase()}</span>{post.postCount && <span className="text-[11px] text-white/75">Posts: {post.postCount}</span>}{post.lastDate && <span className="text-[11px] text-white/75">Last Date: {post.lastDate}</span>}</div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-gray-100 bg-[#fafafe] p-5"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Overview</p><p className="text-[13px] leading-relaxed text-gray-600">{post.description || 'Description preview will appear here.'}</p></div>
                <div className="rounded-2xl border border-gray-100 bg-[#fafafe] p-5"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Important Links</p><div className="space-y-2">{post.importantLinks.slice(0, 3).map((item, index) => <div key={`${item.label}-${index}`} className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2"><span className="text-[12px] font-semibold text-gray-700">{item.label || 'Untitled Link'}</span><span className="text-[10px] uppercase text-gray-400">{item.type}</span></div>)}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
