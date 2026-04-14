'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCircle2, History, Plus, Save, Send, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  approveCmsPost,
  archiveCmsPost,
  createCmsPost,
  getCmsPost,
  getCmsPostHistory,
  publishCmsPost,
  restoreCmsPost,
  submitCmsPost,
  updateCmsPost,
} from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CmsPost, CmsImportantDate, CmsOfficialSource, EditorialStatus } from '@/lib/types';

interface AnnouncementFormProps {
  id?: string;
}

type FormState = {
  title: string;
  slug: string;
  type: CmsPost['type'];
  summary: string;
  shortInfo: string;
  body: string;
  organizationName: string;
  categories: string;
  states: string;
  qualifications: string;
  institutionName: string;
  examName: string;
  location: string;
  salary: string;
  postCount: string;
  applicationStartDate: string;
  lastDate: string;
  examDate: string;
  verificationNote: string;
  tag: '' | 'new' | 'hot' | 'update' | 'last-date';
  metaTitle: string;
  metaDescription: string;
  importantDates: CmsImportantDate[];
  officialSources: CmsOfficialSource[];
  eligibility: Array<{ label: string; description: string }>;
  feeRules: Array<{ category: string; amount: string; paymentNote?: string }>;
  vacancyRows: Array<{ postName: string; department?: string; vacancies: string; payLevel?: string; salaryNote?: string }>;
  admissionPrograms: Array<{ programName: string; level?: string; department?: string; intake?: string; eligibilityNote?: string }>;
};

const EMPTY_FORM: FormState = {
  title: '',
  slug: '',
  type: 'job',
  summary: '',
  shortInfo: '',
  body: '',
  organizationName: '',
  categories: '',
  states: '',
  qualifications: '',
  institutionName: '',
  examName: '',
  location: '',
  salary: '',
  postCount: '',
  applicationStartDate: '',
  lastDate: '',
  examDate: '',
  verificationNote: '',
  tag: '',
  metaTitle: '',
  metaDescription: '',
  importantDates: [{ label: 'Application Start', value: '', kind: 'application_start' }],
  officialSources: [{ label: 'Official Notification', url: '', sourceType: 'notification', isPrimary: true }],
  eligibility: [{ label: 'Qualification', description: '' }],
  feeRules: [{ category: 'GENERAL', amount: '', paymentNote: '' }],
  vacancyRows: [{ postName: '', department: '', vacancies: '', payLevel: '', salaryNote: '' }],
  admissionPrograms: [{ programName: '', level: '', department: '', intake: '', eligibilityNote: '' }],
};

function splitTags(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => ({ name: item, slug: item.toLowerCase().replace(/[^a-z0-9]+/g, '-') }));
}

function toForm(post: CmsPost): FormState {
  return {
    title: post.title,
    slug: post.slug,
    type: post.type,
    summary: post.summary,
    shortInfo: post.shortInfo || '',
    body: post.body || '',
    organizationName: post.organization?.name || '',
    categories: post.categories.map((item) => item.name).join(', '),
    states: post.states.map((item) => item.name).join(', '),
    qualifications: post.qualifications.map((item) => item.name).join(', '),
    institutionName: post.institution?.name || '',
    examName: post.exam?.name || '',
    location: post.location || '',
    salary: post.salary || '',
    postCount: post.postCount || '',
    applicationStartDate: post.applicationStartDate || '',
    lastDate: post.lastDate || '',
    examDate: post.examDate || '',
    verificationNote: post.trust.verificationNote || '',
    tag: post.tag || '',
    metaTitle: post.seo?.metaTitle || '',
    metaDescription: post.seo?.metaDescription || '',
    importantDates: post.importantDates.length ? post.importantDates : EMPTY_FORM.importantDates,
    officialSources: post.officialSources.length ? post.officialSources : EMPTY_FORM.officialSources,
    eligibility: post.eligibility.length ? post.eligibility : EMPTY_FORM.eligibility,
    feeRules: post.feeRules.length ? post.feeRules : EMPTY_FORM.feeRules,
    vacancyRows: post.vacancyRows.length ? post.vacancyRows : EMPTY_FORM.vacancyRows,
    admissionPrograms: post.admissionPrograms.length ? post.admissionPrograms : EMPTY_FORM.admissionPrograms,
  };
}

function buildPayload(form: FormState) {
  return {
    title: form.title,
    slug: form.slug || undefined,
    type: form.type,
    summary: form.summary,
    shortInfo: form.shortInfo || undefined,
    body: form.body || undefined,
    organization: form.organizationName ? { name: form.organizationName, slug: form.organizationName.toLowerCase().replace(/[^a-z0-9]+/g, '-') } : null,
    categories: splitTags(form.categories),
    states: splitTags(form.states),
    qualifications: splitTags(form.qualifications),
    institution: form.institutionName ? { name: form.institutionName, slug: form.institutionName.toLowerCase().replace(/[^a-z0-9]+/g, '-') } : null,
    exam: form.examName ? { name: form.examName, slug: form.examName.toLowerCase().replace(/[^a-z0-9]+/g, '-') } : null,
    location: form.location || undefined,
    salary: form.salary || undefined,
    postCount: form.postCount || undefined,
    applicationStartDate: form.applicationStartDate || undefined,
    lastDate: form.lastDate || undefined,
    examDate: form.examDate || undefined,
    verificationNote: form.verificationNote || undefined,
    tag: form.tag || undefined,
    seo: {
      metaTitle: form.metaTitle || undefined,
      metaDescription: form.metaDescription || undefined,
    },
    importantDates: form.importantDates.filter((item) => item.label || item.value),
    officialSources: form.officialSources.filter((item) => item.label && item.url),
    eligibility: form.eligibility.filter((item) => item.label && item.description),
    feeRules: form.feeRules.filter((item) => item.category && item.amount),
    vacancyRows: form.vacancyRows.filter((item) => item.postName && item.vacancies),
    admissionPrograms: form.admissionPrograms.filter((item) => item.programName),
  };
}

function statusPill(status: EditorialStatus) {
  const map: Record<EditorialStatus, string> = {
    draft: 'bg-amber-50 text-amber-700',
    in_review: 'bg-blue-50 text-blue-700',
    approved: 'bg-emerald-50 text-emerald-700',
    published: 'bg-green-50 text-green-700',
    archived: 'bg-slate-100 text-slate-700',
  };
  return map[status];
}

function RowEditor<T extends Record<string, any>>({
  title,
  rows,
  onChange,
  createRow,
}: {
  title: string;
  rows: T[];
  onChange: (next: T[]) => void;
  createRow: () => T;
}) {
  return (
    <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-bold text-gray-900">{title}</h3>
        <button
          type="button"
          onClick={() => onChange([...rows, createRow()])}
          className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Plus size={12} />
          Add Row
        </button>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-2 rounded-xl border border-gray-100 bg-gray-50 p-3 md:grid-cols-2">
            {Object.entries(row).map(([key, value]) => (
              <input
                key={key}
                value={typeof value === 'boolean' ? String(value) : value || ''}
                onChange={(event) => {
                  const next = [...rows];
                  next[index] = { ...next[index], [key]: event.target.value } as T;
                  onChange(next);
                }}
                placeholder={key}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] text-gray-700 outline-none"
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnnouncementForm({ id }: AnnouncementFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const postQuery = useQuery({
    queryKey: ['cms-post', id],
    queryFn: () => getCmsPost(id!),
    enabled: isEdit,
  });

  const historyQuery = useQuery({
    queryKey: ['cms-post-history', id],
    queryFn: () => getCmsPostHistory(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (postQuery.data?.data) {
      setForm(toForm(postQuery.data.data));
    }
  }, [postQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload(form);
      return isEdit ? updateCmsPost(id!, payload) : createCmsPost(payload);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['cms-posts'] });
      if (!isEdit) {
        router.replace(`/announcements/${result.data.id}`);
      }
      toast.success('Draft saved.');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save draft'),
  });

  const workflowMutation = useMutation({
    mutationFn: async (action: 'submit' | 'approve' | 'publish' | 'archive' | 'restore') => {
      if (!id) throw new Error('Save the draft before running workflow actions');
      if (action === 'submit') return submitCmsPost(id);
      if (action === 'approve') return approveCmsPost(id);
      if (action === 'publish') return publishCmsPost(id);
      if (action === 'archive') return archiveCmsPost(id);
      return restoreCmsPost(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cms-posts'] });
      queryClient.invalidateQueries({ queryKey: ['cms-post', id] });
      queryClient.invalidateQueries({ queryKey: ['cms-post-history', id] });
      toast.success('Workflow updated.');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to update workflow'),
  });

  const currentStatus = postQuery.data?.data.status || 'draft';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[22px] font-black text-gray-900">{isEdit ? 'Edit Post' : 'Create Post'}</h1>
            <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${statusPill(currentStatus)}`}>{currentStatus.replace('_', ' ')}</span>
          </div>
          <p className="text-[12px] text-gray-500">Structured CMS editor for jobs, results, admit cards, admissions, and notices.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <Save size={14} />
            Save Draft
          </button>
          {isEdit && currentStatus === 'draft' ? (
            <button
              type="button"
              onClick={() => workflowMutation.mutate('submit')}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 px-3 py-2 text-[12px] font-semibold text-blue-700 hover:bg-blue-50"
            >
              <Send size={14} />
              Submit
            </button>
          ) : null}
          {isEdit && currentStatus === 'in_review' && ['reviewer', 'admin', 'superadmin'].includes(user?.role || '') ? (
            <button
              type="button"
              onClick={() => workflowMutation.mutate('approve')}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 px-3 py-2 text-[12px] font-semibold text-emerald-700 hover:bg-emerald-50"
            >
              <CheckCircle2 size={14} />
              Approve
            </button>
          ) : null}
          {isEdit && currentStatus === 'approved' && ['admin', 'superadmin'].includes(user?.role || '') ? (
            <button
              type="button"
              onClick={() => workflowMutation.mutate('publish')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#e65100] px-4 py-2 text-[12px] font-bold text-white hover:opacity-90"
            >
              <CheckCircle2 size={14} />
              Publish
            </button>
          ) : null}
          {isEdit && ['approved', 'published'].includes(currentStatus) && ['admin', 'superadmin'].includes(user?.role || '') ? (
            <button
              type="button"
              onClick={() => workflowMutation.mutate('archive')}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Archive size={14} />
              Archive
            </button>
          ) : null}
          {isEdit && currentStatus === 'archived' && ['admin', 'superadmin'].includes(user?.role || '') ? (
            <button
              type="button"
              onClick={() => workflowMutation.mutate('restore')}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Undo2 size={14} />
              Restore
            </button>
          ) : null}
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.65fr_0.95fr]">
        <div className="space-y-5">
          <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Title</label>
              <input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Slug</label>
              <input value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Type</label>
              <select value={form.type} onChange={(event) => setForm((current) => ({ ...current, type: event.target.value as CmsPost['type'] }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none">
                <option value="job">Job</option>
                <option value="result">Result</option>
                <option value="admit-card">Admit Card</option>
                <option value="admission">Admission</option>
                <option value="answer-key">Answer Key</option>
                <option value="syllabus">Syllabus</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Summary</label>
              <textarea value={form.summary} onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} rows={3} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Body</label>
              <textarea value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} rows={8} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-2">
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Organization</label>
              <input value={form.organizationName} onChange={(event) => setForm((current) => ({ ...current, organizationName: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Institution / University</label>
              <input value={form.institutionName} onChange={(event) => setForm((current) => ({ ...current, institutionName: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Categories</label>
              <input value={form.categories} onChange={(event) => setForm((current) => ({ ...current, categories: event.target.value }))} placeholder="Central Govt, SSC, Banking" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">States</label>
              <input value={form.states} onChange={(event) => setForm((current) => ({ ...current, states: event.target.value }))} placeholder="Uttar Pradesh, Bihar" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Qualifications</label>
              <input value={form.qualifications} onChange={(event) => setForm((current) => ({ ...current, qualifications: event.target.value }))} placeholder="Graduate, 12th Pass" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Exam</label>
              <input value={form.examName} onChange={(event) => setForm((current) => ({ ...current, examName: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
          </div>

          <div className="grid gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm md:grid-cols-3">
            {[
              ['Location', 'location'],
              ['Salary', 'salary'],
              ['Post Count', 'postCount'],
              ['Application Start', 'applicationStartDate'],
              ['Last Date', 'lastDate'],
              ['Exam / Result Date', 'examDate'],
            ].map(([label, key]) => (
              <div key={key}>
                <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">{label}</label>
                <input
                  value={form[key as keyof FormState] as string}
                  onChange={(event) => setForm((current) => ({ ...current, [key]: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none"
                />
              </div>
            ))}
          </div>

          <RowEditor title="Official Sources" rows={form.officialSources} onChange={(officialSources) => setForm((current) => ({ ...current, officialSources }))} createRow={() => ({ label: '', url: '', sourceType: 'website', isPrimary: false })} />
          <RowEditor title="Important Dates" rows={form.importantDates} onChange={(importantDates) => setForm((current) => ({ ...current, importantDates }))} createRow={() => ({ label: '', value: '', kind: 'other' })} />
          <RowEditor title="Eligibility" rows={form.eligibility} onChange={(eligibility) => setForm((current) => ({ ...current, eligibility }))} createRow={() => ({ label: '', description: '' })} />
          <RowEditor title="Fee Rules" rows={form.feeRules} onChange={(feeRules) => setForm((current) => ({ ...current, feeRules }))} createRow={() => ({ category: '', amount: '', paymentNote: '' })} />
          <RowEditor title="Vacancy Rows" rows={form.vacancyRows} onChange={(vacancyRows) => setForm((current) => ({ ...current, vacancyRows }))} createRow={() => ({ postName: '', department: '', vacancies: '', payLevel: '', salaryNote: '' })} />
          <RowEditor title="Admission Programs" rows={form.admissionPrograms} onChange={(admissionPrograms) => setForm((current) => ({ ...current, admissionPrograms }))} createRow={() => ({ programName: '', level: '', department: '', intake: '', eligibilityNote: '' })} />
        </div>

        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <h3 className="text-[13px] font-bold text-gray-900">Trust and SEO</h3>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Verification Note</label>
              <textarea value={form.verificationNote} onChange={(event) => setForm((current) => ({ ...current, verificationNote: event.target.value }))} rows={4} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Urgency Tag</label>
              <select value={form.tag} onChange={(event) => setForm((current) => ({ ...current, tag: event.target.value as FormState['tag'] }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none">
                <option value="">None</option>
                <option value="new">NEW</option>
                <option value="hot">HOT</option>
                <option value="update">UPDATE</option>
                <option value="last-date">LAST DATE</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Meta Title</label>
              <input value={form.metaTitle} onChange={(event) => setForm((current) => ({ ...current, metaTitle: event.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-bold uppercase tracking-[0.08em] text-gray-500">Meta Description</label>
              <textarea value={form.metaDescription} onChange={(event) => setForm((current) => ({ ...current, metaDescription: event.target.value }))} rows={4} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[13px] text-gray-800 outline-none" />
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2">
              <History size={14} />
              <h3 className="text-[13px] font-bold text-gray-900">History</h3>
            </div>
            {historyQuery.isLoading ? (
              <p className="text-[12px] text-gray-500">Loading history…</p>
            ) : historyQuery.data?.data ? (
              <div className="space-y-2 text-[12px] text-gray-700">
                {(historyQuery.data.data.audit || []).slice(0, 6).map((item: any) => (
                  <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="font-semibold">{item.action}</div>
                    <div className="text-[11px] text-gray-500">{item.summary}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-gray-500">Save the draft to start version history.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
