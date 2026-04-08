'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Edit2,
  ExternalLink,
  GripVertical,
  Link2,
  Plus,
  Radio,
  Save,
  ToggleLeft,
  ToggleRight,
  Trash2,
  X,
} from 'lucide-react';

type TickerItem = {
  id: string;
  text: string;
  emoji: string;
  active: boolean;
  url: string;
};

type QuickLink = {
  id: string;
  label: string;
  url: string;
  category: string;
  active: boolean;
};

const INITIAL_TICKER: TickerItem[] = [
  { id: '1', text: 'SSC CGL 2026 Notification Out — Apply Before 30 April!', emoji: '🔥', active: true, url: '/detail/ssc-cgl-2026' },
  { id: '2', text: 'UPSC CSE Prelims 2026 Result Declared!', emoji: '📢', active: true, url: '#' },
  { id: '3', text: 'Railway Group D Admit Card Released', emoji: '📋', active: true, url: '#' },
  { id: '4', text: 'IBPS PO 2026 Online Form Started', emoji: '🏦', active: true, url: '#' },
  { id: '5', text: 'CTET 2026 Registration Begins', emoji: '🏫', active: true, url: '#' },
];

const INITIAL_LINKS: QuickLink[] = [
  { id: '1', label: 'UPSC', url: 'https://upsc.gov.in', category: 'PSC', active: true },
  { id: '2', label: 'SSC', url: 'https://ssc.nic.in', category: 'Central', active: true },
  { id: '3', label: 'IBPS', url: 'https://ibps.in', category: 'Banking', active: true },
  { id: '4', label: 'RRB', url: 'https://indianrailways.gov.in', category: 'Railway', active: true },
  { id: '5', label: 'NTA', url: 'https://nta.ac.in', category: 'Education', active: true },
  { id: '6', label: 'UPPSC', url: 'https://uppsc.up.nic.in', category: 'State PSC', active: true },
];

const EMOJIS = ['🔥', '📢', '📋', '🏦', '⚔️', '👮', '📝', '🎯', '🏫', '🔔', '⭐', '🆕', '🏆', '✅', '⚡', '📌'];

export function NotificationsPage() {
  const [tab, setTab] = useState<'ticker' | 'links'>('ticker');
  const [ticker, setTicker] = useState<TickerItem[]>(INITIAL_TICKER);
  const [links, setLinks] = useState<QuickLink[]>(INITIAL_LINKS);
  const [modal, setModal] = useState<'add-ticker' | 'edit-ticker' | 'add-link' | 'edit-link' | 'delete-ticker' | 'delete-link' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tickerForm, setTickerForm] = useState({ text: '', emoji: '🔥', url: '', active: true });
  const [linkForm, setLinkForm] = useState({ label: '', url: '', category: '', active: true });

  function openAddTicker() {
    setTickerForm({ text: '', emoji: '🔥', url: '', active: true });
    setModal('add-ticker');
  }

  function openEditTicker(item: TickerItem) {
    setEditingId(item.id);
    setTickerForm({ text: item.text, emoji: item.emoji, url: item.url, active: item.active });
    setModal('edit-ticker');
  }

  function saveTicker() {
    if (!tickerForm.text.trim()) {
      toast.error('Ticker text is required.');
      return;
    }

    if (modal === 'add-ticker') {
      setTicker(current => [...current, { id: Date.now().toString(), ...tickerForm }]);
      toast.success('Ticker item added.');
    } else {
      setTicker(current => current.map(item => item.id === editingId ? { ...item, ...tickerForm } : item));
      toast.success('Ticker item updated.');
    }

    setModal(null);
  }

  function deleteTicker() {
    setTicker(current => current.filter(item => item.id !== editingId));
    setModal(null);
    toast.success('Ticker item deleted.');
  }

  function openAddLink() {
    setLinkForm({ label: '', url: '', category: '', active: true });
    setModal('add-link');
  }

  function openEditLink(item: QuickLink) {
    setEditingId(item.id);
    setLinkForm({ label: item.label, url: item.url, category: item.category, active: item.active });
    setModal('edit-link');
  }

  function saveLink() {
    if (!linkForm.label.trim() || !linkForm.url.trim()) {
      toast.error('Label and URL are required.');
      return;
    }

    if (modal === 'add-link') {
      setLinks(current => [...current, { id: Date.now().toString(), ...linkForm }]);
      toast.success('Quick link added.');
    } else {
      setLinks(current => current.map(item => item.id === editingId ? { ...item, ...linkForm } : item));
      toast.success('Quick link updated.');
    }

    setModal(null);
  }

  function deleteLink() {
    setLinks(current => current.filter(item => item.id !== editingId));
    setModal(null);
    toast.success('Quick link deleted.');
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-gray-800">Ticker & Quick Links</h2>
          <p className="text-[11px] text-gray-400">Manage the scrolling ticker bar and important website links</p>
        </div>
        <button
          type="button"
          onClick={tab === 'ticker' ? openAddTicker : openAddLink}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-bold text-white shadow-md transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 12px rgba(230,81,0,0.3)' }}
        >
          <Plus className="h-4 w-4" />
          Add New
        </button>
      </div>

      <div className="flex w-fit gap-1 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setTab('ticker')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${tab === 'ticker' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Radio className="h-3.5 w-3.5" />
          Ticker Items ({ticker.filter(item => item.active).length} active)
        </button>
        <button
          type="button"
          onClick={() => setTab('links')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all ${tab === 'links' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Link2 className="h-3.5 w-3.5" />
          Quick Links ({links.filter(item => item.active).length} active)
        </button>
      </div>

      {tab === 'ticker' ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-[22px] border border-border bg-card shadow-sm">
            <div className="flex items-center gap-2 border-b border-border bg-muted/50 px-4 py-2.5">
              <Radio className="h-3 w-3 text-blue-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Live Preview</span>
            </div>
            <div className="overflow-hidden bg-accent/10 py-3 pause-on-hover flex whitespace-nowrap">
              {ticker.filter(item => item.active).length > 0 ? (
                <>
                  <div className="animate-marquee flex gap-8 shrink-0 pr-8">
                    {ticker.filter(item => item.active).map(item => (
                      <a key={`1-${item.id}`} href={item.url || '#'} className="text-[13px] font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors flex items-center gap-1.5" onClick={e => e.preventDefault()}>
                        <span>{item.emoji}</span>
                        <span>{item.text}</span>
                      </a>
                    ))}
                  </div>
                  <div className="animate-marquee flex gap-8 shrink-0 pr-8" aria-hidden="true">
                    {ticker.filter(item => item.active).map(item => (
                      <a key={`2-${item.id}`} href={item.url || '#'} className="text-[13px] font-semibold text-foreground hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors flex items-center gap-1.5" onClick={e => e.preventDefault()}>
                        <span>{item.emoji}</span>
                        <span>{item.text}</span>
                      </a>
                    ))}
                  </div>
                </>
              ) : (
                <p className="px-4 text-[12px] text-muted-foreground">No active ticker items</p>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
            <div className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff] px-4 py-3">
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">#</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Ticker Text</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Status</span>
              <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Actions</span>
            </div>

            {ticker.map((item, index) => (
              <div
                key={item.id}
                className={`grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 border-b border-gray-50 px-4 py-3.5 transition-colors hover:bg-orange-50/20 ${index % 2 === 1 ? 'bg-gray-50/20' : ''}`}
              >
                <div className="flex items-center gap-2">
                  <GripVertical className="h-3.5 w-3.5 text-gray-300" />
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gray-100 text-[14px]">{item.emoji}</span>
                </div>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-gray-700">{item.text}</p>
                  {item.url && <p className="truncate text-[10px] text-gray-400">{item.url}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => setTicker(current => current.map(entry => entry.id === item.id ? { ...entry, active: !entry.active } : entry))}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {item.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                  {item.active ? 'Active' : 'Inactive'}
                </button>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => openEditTicker(item)} className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => { setEditingId(item.id); setModal('delete-ticker'); }} className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[22px] border border-gray-100 bg-white shadow-sm">
          <div className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-3 border-b border-gray-100 bg-gradient-to-r from-[#f8f9ff] to-[#f0f4ff] px-4 py-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Label / Name</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">URL</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Status</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gray-500">Actions</span>
          </div>

          {links.map((item, index) => (
            <div
              key={item.id}
              className={`grid grid-cols-[1fr_1fr_auto_auto] items-center gap-3 border-b border-gray-50 px-4 py-3.5 transition-colors hover:bg-blue-50/20 ${index % 2 === 1 ? 'bg-gray-50/20' : ''}`}
            >
              <div>
                <p className="text-[13px] font-bold text-gray-800">{item.label}</p>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[9px] font-bold text-blue-600">{item.category}</span>
              </div>
              <div className="flex min-w-0 items-center gap-1.5">
                <ExternalLink className="h-3 w-3 shrink-0 text-gray-400" />
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="truncate text-[11px] text-blue-600 hover:underline">{item.url}</a>
              </div>
              <button
                type="button"
                onClick={() => setLinks(current => current.map(entry => entry.id === item.id ? { ...entry, active: !entry.active } : entry))}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${item.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
              >
                {item.active ? <ToggleRight className="h-3.5 w-3.5" /> : <ToggleLeft className="h-3.5 w-3.5" />}
                {item.active ? 'Active' : 'Inactive'}
              </button>
              <div className="flex items-center gap-1.5">
                <button type="button" onClick={() => openEditLink(item)} className="rounded-lg bg-blue-50 p-2 text-blue-600 transition-colors hover:bg-blue-100">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => { setEditingId(item.id); setModal('delete-link'); }} className="rounded-lg bg-red-50 p-2 text-red-500 transition-colors hover:bg-red-100">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(modal === 'add-ticker' || modal === 'edit-ticker') && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(10,20,60,0.55)] p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-md overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4" style={{ background: 'linear-gradient(90deg, #060d2e, #1a237e)' }}>
              <div className="flex items-center gap-2.5">
                <Radio className="h-4 w-4 text-white" />
                <span className="text-[14px] font-extrabold text-white">{modal === 'add-ticker' ? 'Add Ticker Item' : 'Edit Ticker Item'}</span>
              </div>
              <button type="button" onClick={() => setModal(null)} className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Emoji Icon</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setTickerForm(current => ({ ...current, emoji }))}
                      className={`flex h-9 w-9 items-center justify-center rounded-lg text-xl transition-all ${tickerForm.emoji === emoji ? 'scale-110 bg-orange-50 ring-2 ring-orange-400' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Ticker Text</label>
                <textarea
                  value={tickerForm.text}
                  onChange={event => setTickerForm(current => ({ ...current, text: event.target.value }))}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Link URL</label>
                <input
                  value={tickerForm.url}
                  onChange={event => setTickerForm(current => ({ ...current, url: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[13px] font-semibold text-gray-700">Active / Visible</label>
                <button
                  type="button"
                  onClick={() => setTickerForm(current => ({ ...current, active: !current.active }))}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${tickerForm.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {tickerForm.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {tickerForm.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveTicker}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)' }}
              >
                <Save className="h-3.5 w-3.5" />
                Save Item
              </button>
            </div>
          </div>
        </div>
      )}

      {(modal === 'add-link' || modal === 'edit-link') && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(10,20,60,0.55)] p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-md overflow-hidden rounded-[22px] bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4" style={{ background: 'linear-gradient(90deg, #060d2e, #1a237e)' }}>
              <div className="flex items-center gap-2.5">
                <Link2 className="h-4 w-4 text-white" />
                <span className="text-[14px] font-extrabold text-white">{modal === 'add-link' ? 'Add Quick Link' : 'Edit Quick Link'}</span>
              </div>
              <button type="button" onClick={() => setModal(null)} className="rounded-full p-1.5 text-white/70 transition-colors hover:bg-white/15 hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Display Label</label>
                <input
                  value={linkForm.label}
                  onChange={event => setLinkForm(current => ({ ...current, label: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Website URL</label>
                <input
                  value={linkForm.url}
                  onChange={event => setLinkForm(current => ({ ...current, url: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-blue-400"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase text-gray-600">Category</label>
                <input
                  value={linkForm.category}
                  onChange={event => setLinkForm(current => ({ ...current, category: event.target.value }))}
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none focus:border-blue-400"
                />
              </div>
              <div className="flex items-center gap-3">
                <label className="text-[13px] font-semibold text-gray-700">Active</label>
                <button
                  type="button"
                  onClick={() => setLinkForm(current => ({ ...current, active: !current.active }))}
                  className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold ${linkForm.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}
                >
                  {linkForm.active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                  {linkForm.active ? 'Active' : 'Inactive'}
                </button>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-gray-100 bg-gray-50 px-5 py-4">
              <button type="button" onClick={() => setModal(null)} className="rounded-xl border border-gray-200 px-5 py-2.5 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={saveLink}
                className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #1565c0, #1a237e)' }}
              >
                <Save className="h-3.5 w-3.5" />
                Save Link
              </button>
            </div>
          </div>
        </div>
      )}

      {(modal === 'delete-ticker' || modal === 'delete-link') && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-[rgba(10,20,60,0.55)] p-4 backdrop-blur-[4px]">
          <div className="w-full max-w-sm rounded-[22px] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-[18px] bg-red-100">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>
            <h3 className="mb-2 text-[16px] font-extrabold text-gray-800">Delete Item?</h3>
            <p className="mb-5 text-[13px] text-gray-500">This will permanently remove the selected item.</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setModal(null)} className="flex-1 rounded-xl border border-gray-200 py-2.5 text-[13px] font-semibold text-gray-600 transition-colors hover:bg-gray-50">
                Cancel
              </button>
              <button
                type="button"
                onClick={modal === 'delete-ticker' ? deleteTicker : deleteLink}
                className="flex-1 rounded-xl py-2.5 text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #c62828, #b71c1c)' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
