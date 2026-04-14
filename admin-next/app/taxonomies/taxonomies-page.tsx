'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Edit2, Globe, Plus, Save, Search, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';

import { createEditorialTaxonomy, deleteEditorialTaxonomy, getEditorialTaxonomies, updateEditorialTaxonomy } from '@/lib/api';

type TaxonomyType = 'states' | 'organizations' | 'categories' | 'institutions' | 'exams' | 'qualifications';

const TAXONOMY_TABS: Array<{ type: TaxonomyType; label: string; help: string }> = [
  { type: 'states', label: 'States', help: 'State landing pages and state-wise browsing' },
  { type: 'organizations', label: 'Organizations', help: 'Recruiting bodies, boards, commissions, and departments' },
  { type: 'categories', label: 'Categories', help: 'Editorial categories used across jobs, results, admit cards, and admissions' },
  { type: 'qualifications', label: 'Qualifications', help: 'Qualification tags used for jobs and admission eligibility filters' },
  { type: 'institutions', label: 'Institutions', help: 'Colleges and universities for admissions' },
  { type: 'exams', label: 'Exams', help: 'Exam entities used across results, admit cards, and notices' },
];

const EMPTY_FORM = {
  id: '',
  name: '',
  slug: '',
  shortName: '',
  description: '',
  officialWebsite: '',
  priority: '',
};

export function TaxonomiesPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<TaxonomyType>('states');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<typeof EMPTY_FORM | null>(null);

  const taxonomyQuery = useQuery({
    queryKey: ['editorial-taxonomies', type],
    queryFn: () => getEditorialTaxonomies(type),
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: typeof EMPTY_FORM) => {
      const body = {
        name: payload.name,
        slug: payload.slug || undefined,
        shortName: payload.shortName || undefined,
        description: payload.description || undefined,
        officialWebsite: payload.officialWebsite || undefined,
        priority: payload.priority ? Number(payload.priority) : undefined,
      };

      if (payload.id) {
        return updateEditorialTaxonomy(type, payload.id, body);
      }
      return createEditorialTaxonomy(type, body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-taxonomies', type] });
      setEditing(null);
      toast.success('Taxonomy saved.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save taxonomy');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEditorialTaxonomy(type, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editorial-taxonomies', type] });
      toast.success('Taxonomy deleted.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete taxonomy');
    },
  });

  const filtered = useMemo(() => {
    const items = taxonomyQuery.data?.data || [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      item.name.toLowerCase().includes(q) ||
      item.slug.toLowerCase().includes(q) ||
      item.shortName?.toLowerCase().includes(q),
    );
  }, [search, taxonomyQuery.data?.data]);

  const activeTab = TAXONOMY_TABS.find((item) => item.type === type) || TAXONOMY_TABS[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-800">Taxonomy Manager</h2>
          <p className="text-[11px] text-gray-400">{activeTab.help}</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing({ ...EMPTY_FORM })}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shadow-md transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 12px rgba(230,81,0,0.3)' }}
        >
          <Plus className="h-4 w-4" />
          Add Taxonomy
        </button>
      </div>

      <div className="flex flex-wrap gap-2 rounded-[22px] border border-gray-100 bg-white p-3 shadow-sm">
        {TAXONOMY_TABS.map((tab) => (
          <button
            key={tab.type}
            type="button"
            onClick={() => {
              setType(tab.type);
              setSearch('');
            }}
            className={`rounded-xl px-3.5 py-2 text-[12px] font-semibold transition-all ${type === tab.type ? 'bg-[#0d1b6e] text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:text-gray-800'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-[22px] border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex min-w-48 items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
          <Search className="h-3.5 w-3.5 shrink-0 text-gray-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${activeTab.label.toLowerCase()}...`}
            className="flex-1 bg-transparent text-[13px] text-gray-700 outline-none placeholder:text-gray-400"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
        <div className="grid grid-cols-[1.1fr_auto_1.2fr_auto_auto] items-center gap-3 border-b border-[#e8ecf8] bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff] px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Name</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Priority</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Description</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Website</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Actions</span>
        </div>

        {filtered.map((item, index) => (
          <div
            key={item.id}
            className={`grid grid-cols-[1.1fr_auto_1.2fr_auto_auto] items-center gap-3 border-b border-gray-50 px-4 py-3.5 transition-colors hover:bg-blue-50/20 ${index % 2 === 1 ? 'bg-gray-50/20' : ''}`}
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-gray-800">{item.name}</p>
              <p className="truncate text-[11px] text-gray-400">{item.slug}{item.shortName ? ` · ${item.shortName}` : ''}</p>
            </div>
            <span className="text-[12px] font-bold text-gray-700">{item.priority ?? '-'}</span>
            <p className="truncate text-[12px] text-gray-500">{item.description || '-'}</p>
            {item.officialWebsite ? (
              <a href={item.officialWebsite} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline">
                <Globe className="h-3 w-3" />
                Visit
              </a>
            ) : (
              <span className="text-[12px] text-gray-400">-</span>
            )}
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setEditing({
                  id: item.id,
                  name: item.name,
                  slug: item.slug,
                  shortName: item.shortName || '',
                  description: item.description || '',
                  officialWebsite: item.officialWebsite || '',
                  priority: item.priority !== undefined ? String(item.priority) : '',
                })}
                className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100"
              >
                <Edit2 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(item.id)}
                className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}

        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center text-[13px] text-gray-500">No taxonomies found for the current filter.</div>
        ) : null}
      </div>

      {editing ? (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(10,20,60,0.55)] p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-xl overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4" style={{ background: 'linear-gradient(90deg, #060d2e, #1a237e)' }}>
              <span className="text-[14px] font-extrabold text-white">{editing.id ? 'Edit Taxonomy' : 'Add Taxonomy'}</span>
              <button type="button" onClick={() => setEditing(null)} className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-4 p-5 md:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Name</label>
                <input value={editing.name} onChange={(event) => setEditing((current) => current ? { ...current, name: event.target.value } : current)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Slug</label>
                <input value={editing.slug} onChange={(event) => setEditing((current) => current ? { ...current, slug: event.target.value } : current)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Short Name</label>
                <input value={editing.shortName} onChange={(event) => setEditing((current) => current ? { ...current, shortName: event.target.value } : current)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none" />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Priority</label>
                <input value={editing.priority} onChange={(event) => setEditing((current) => current ? { ...current, priority: event.target.value } : current)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Official Website</label>
                <input value={editing.officialWebsite} onChange={(event) => setEditing((current) => current ? { ...current, officialWebsite: event.target.value } : current)} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Description</label>
                <textarea value={editing.description} onChange={(event) => setEditing((current) => current ? { ...current, description: event.target.value } : current)} rows={4} className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <button type="button" onClick={() => setEditing(null)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-100">
                Cancel
              </button>
              <button
                type="button"
                disabled={saveMutation.isPending || !editing.name.trim()}
                onClick={() => saveMutation.mutate(editing)}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)' }}
              >
                <Save className="h-3.5 w-3.5" />
                Save Taxonomy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
