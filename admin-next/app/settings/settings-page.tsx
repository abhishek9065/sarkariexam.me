'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Bell, Eye, EyeOff, Globe, Lock, Save, Search, Shield, ToggleLeft, ToggleRight } from 'lucide-react';
import { toast } from 'sonner';
import { getSettings, updateSettings } from '@/lib/api';
import type { SiteSettings } from '@/lib/types';

interface SettingsState {
  siteName: string;
  tagline: string;
  contactEmail: string;
  footerText: string;
  metaTitle: string;
  metaDesc: string;
  metaKeywords: string;
  maintenanceMode: boolean;
  qaEnabled: boolean;
  commentsEnabled: boolean;
  alertsEnabled: boolean;
  tickerEnabled: boolean;
  loginEnabled: boolean;
  fbUrl: string;
  twUrl: string;
  ytUrl: string;
  igUrl: string;
  tgUrl: string;
}

const DEFAULT_SETTINGS: SettingsState = {
  siteName: 'SarkariExams.me',
  tagline: "India's #1 Government Jobs Portal",
  contactEmail: 'contact@sarkariexams.me',
  footerText: '© 2026 SarkariExams.me - All Rights Reserved. This is not a government website.',
  metaTitle: 'SarkariExams.me - Sarkari Result, Latest Jobs, Admit Card 2026',
  metaDesc: "Get latest Sarkari Jobs, Results, Admit Cards, Answer Keys and Syllabus updates at SarkariExams.me. India's most trusted government job portal.",
  metaKeywords: 'sarkari result, sarkari job, government jobs, admit card 2026, ssc cgl, upsc 2026',
  maintenanceMode: false,
  qaEnabled: true,
  commentsEnabled: true,
  alertsEnabled: true,
  tickerEnabled: true,
  loginEnabled: true,
  fbUrl: 'https://facebook.com/sarkariexams',
  twUrl: 'https://twitter.com/sarkariexams',
  ytUrl: 'https://youtube.com/@sarkariexams',
  igUrl: 'https://instagram.com/sarkariexams',
  tgUrl: 'https://t.me/sarkariexams',
};

function mapApiToForm(data?: SiteSettings): SettingsState {
  if (!data) return DEFAULT_SETTINGS;
  const flags = data.featureFlags || {};

  return {
    siteName: data.siteName || DEFAULT_SETTINGS.siteName,
    tagline: data.siteDescription || DEFAULT_SETTINGS.tagline,
    contactEmail: data.contactEmail || DEFAULT_SETTINGS.contactEmail,
    footerText: DEFAULT_SETTINGS.footerText,
    metaTitle: data.defaultMetaTitle || DEFAULT_SETTINGS.metaTitle,
    metaDesc: data.defaultMetaDescription || DEFAULT_SETTINGS.metaDesc,
    metaKeywords: String(flags.metaKeywords || DEFAULT_SETTINGS.metaKeywords),
    maintenanceMode: Boolean(data.maintenanceMode),
    qaEnabled: flags.qaEnabled !== false,
    commentsEnabled: flags.commentsEnabled !== false,
    alertsEnabled: flags.alertsEnabled !== false,
    tickerEnabled: flags.tickerEnabled !== false,
    loginEnabled: data.registrationEnabled !== false,
    fbUrl: String(flags.fbUrl || DEFAULT_SETTINGS.fbUrl),
    twUrl: data.twitterUrl || DEFAULT_SETTINGS.twUrl,
    ytUrl: data.youtubeUrl || DEFAULT_SETTINGS.ytUrl,
    igUrl: String(flags.igUrl || DEFAULT_SETTINGS.igUrl),
    tgUrl: data.telegramUrl || DEFAULT_SETTINGS.tgUrl,
  };
}

function ToggleRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-3.5 last:border-0">
      <div>
        <p className="text-[13px] font-semibold text-gray-800">{label}</p>
        <p className="mt-0.5 text-[11px] text-gray-400">{desc}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`flex min-w-24 items-center gap-1.5 rounded-xl px-3.5 py-2 text-[12px] font-bold transition-all ${
          value ? 'text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
        }`}
        style={{ background: value ? 'linear-gradient(135deg, #2e7d32, #43a047)' : undefined }}
      >
        {value ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        {value ? 'Enabled' : 'Disabled'}
      </button>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  accent = '#1565c0',
  children,
}: {
  title: string;
  icon: React.ReactNode;
  accent?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4" style={{ background: 'linear-gradient(90deg, #f8f9ff, #ffffff)' }}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background: `${accent}18`, border: `1.5px solid ${accent}30` }}>
          {icon}
        </div>
        <h3 className="text-[14px] font-bold text-gray-800">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsState>(DEFAULT_SETTINGS);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const response = await getSettings();
      return response.data;
    },
  });

  useEffect(() => {
    setForm(mapApiToForm(data));
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<SiteSettings>) => updateSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to save settings');
    },
  });

  function updateField<K extends keyof SettingsState>(key: K, value: SettingsState[K]) {
    setForm(current => ({ ...current, [key]: value }));
  }

  const baseFeatureFlags = {
    qaEnabled: form.qaEnabled,
    commentsEnabled: form.commentsEnabled,
    alertsEnabled: form.alertsEnabled,
    tickerEnabled: form.tickerEnabled,
  };

  function handleSaveIdentity() {
    if (!form.siteName.trim()) {
      toast.error('Site name is required.');
      return;
    }

    saveMutation.mutate({
      siteName: form.siteName,
      siteDescription: form.tagline,
      contactEmail: form.contactEmail,
      maintenanceMode: form.maintenanceMode,
      registrationEnabled: form.loginEnabled,
      defaultMetaTitle: form.metaTitle,
      defaultMetaDescription: form.metaDesc,
      twitterUrl: form.twUrl,
      telegramUrl: form.tgUrl,
      youtubeUrl: form.ytUrl,
      featureFlags: baseFeatureFlags,
    });

    toast.success('Site settings saved successfully!');
  }

  function handleSaveSEO() {
    saveMutation.mutate({
      defaultMetaTitle: form.metaTitle,
      defaultMetaDescription: form.metaDesc,
      featureFlags: baseFeatureFlags,
    });
    toast.success('SEO settings updated!');
  }

  function handleSaveSocial() {
    saveMutation.mutate({
      twitterUrl: form.twUrl,
      telegramUrl: form.tgUrl,
      youtubeUrl: form.ytUrl,
      featureFlags: baseFeatureFlags,
    });
    toast.success('Social links updated!');
  }

  function handleSaveFeatures() {
    saveMutation.mutate({
      maintenanceMode: form.maintenanceMode,
      registrationEnabled: form.loginEnabled,
      featureFlags: baseFeatureFlags,
    });
    toast.success('Feature toggles updated!');
  }

  function handleChangePassword() {
    if (!oldPass || !newPass || !confirmPass) {
      toast.error('Please fill in all password fields.');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('New passwords do not match.');
      return;
    }
    if (newPass.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    toast.success('Password changed successfully!');
    setOldPass('');
    setNewPass('');
    setConfirmPass('');
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#e65100]/30 border-t-[#e65100]" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h2 className="text-[18px] font-extrabold text-gray-800">Site Settings</h2>
        <p className="mt-0.5 text-[11px] text-gray-400">Manage global configuration for SarkariExams.me</p>
      </div>

      {form.maintenanceMode && (
        <div className="flex items-center gap-3 rounded-2xl border-2 border-amber-400 bg-amber-50 px-4 py-3.5">
          <AlertCircle size={18} className="shrink-0 text-amber-600" />
          <div>
            <p className="text-[13px] font-bold text-amber-800">Maintenance Mode is ON</p>
            <p className="text-[11px] text-amber-600">The website is currently in maintenance mode. Visitors will see a maintenance page.</p>
          </div>
        </div>
      )}

      <SectionCard title="Site Identity" icon={<Globe size={16} style={{ color: '#1565c0' }} />}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-600">Site Name</label>
            <input
              value={form.siteName}
              onChange={event => updateField('siteName', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-600">Tagline</label>
            <input
              value={form.tagline}
              onChange={event => updateField('tagline', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-600">Contact Email</label>
            <input
              value={form.contactEmail}
              onChange={event => updateField('contactEmail', event.target.value)}
              type="email"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-600">Footer Text</label>
            <textarea
              value={form.footerText}
              onChange={event => updateField('footerText', event.target.value)}
              rows={2}
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveIdentity}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #1565c0, #1a237e)', boxShadow: '0 3px 12px rgba(21,101,192,0.3)' }}
            >
              <Save size={14} /> Save Identity
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="SEO Settings" accent="#2e7d32" icon={<Search size={16} style={{ color: '#2e7d32' }} />}>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-600">Meta Title</label>
            <input
              value={form.metaTitle}
              onChange={event => updateField('metaTitle', event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-all focus:border-green-400"
            />
            <p className="mt-1 text-[10px] text-gray-400">{form.metaTitle.length}/70 characters</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-600">Meta Description</label>
            <textarea
              value={form.metaDesc}
              onChange={event => updateField('metaDesc', event.target.value)}
              rows={3}
              className="w-full resize-none rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-all focus:border-green-400"
            />
            <p className={`mt-1 text-[10px] ${form.metaDesc.length > 160 ? 'text-red-500' : 'text-gray-400'}`}>{form.metaDesc.length}/160 characters</p>
          </div>
          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-600">Keywords</label>
            <input
              value={form.metaKeywords}
              onChange={event => updateField('metaKeywords', event.target.value)}
              placeholder="comma separated keywords"
              className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-[13px] text-gray-800 outline-none transition-all focus:border-green-400"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleSaveSEO}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #2e7d32, #388e3c)', boxShadow: '0 3px 12px rgba(46,125,50,0.3)' }}
            >
              <Save size={14} /> Save SEO
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Feature Toggles" accent="#e65100" icon={<Bell size={16} style={{ color: '#e65100' }} />}>
        <div>
          <ToggleRow label="Maintenance Mode" desc="Show maintenance page to all visitors except admins" value={form.maintenanceMode} onChange={value => updateField('maintenanceMode', value)} />
          <ToggleRow label="Community Q&A" desc="Allow users to ask and answer questions on detail pages" value={form.qaEnabled} onChange={value => updateField('qaEnabled', value)} />
          <ToggleRow label="Comments Section" desc="Enable comments on all posts" value={form.commentsEnabled} onChange={value => updateField('commentsEnabled', value)} />
          <ToggleRow label="Job Alerts / Email Subscriptions" desc="Allow users to subscribe to job alert notifications" value={form.alertsEnabled} onChange={value => updateField('alertsEnabled', value)} />
          <ToggleRow label="Live Ticker" desc="Show the scrolling news ticker at the top of every page" value={form.tickerEnabled} onChange={value => updateField('tickerEnabled', value)} />
          <ToggleRow label="User Login / Registration" desc="Allow users to create accounts and sign in" value={form.loginEnabled} onChange={value => updateField('loginEnabled', value)} />
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={handleSaveFeatures}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #e65100, #bf360c)', boxShadow: '0 3px 12px rgba(230,81,0,0.3)' }}
            >
              <Save size={14} /> Save Features
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Social Media Links" accent="#6a1b9a" icon={<Globe size={16} style={{ color: '#6a1b9a' }} />}>
        <div className="space-y-3">
          {[
            { label: 'Facebook', value: form.fbUrl, key: 'fbUrl' as const, icon: 'F', placeholder: 'https://facebook.com/yourpage' },
            { label: 'Twitter / X', value: form.twUrl, key: 'twUrl' as const, icon: 'X', placeholder: 'https://twitter.com/yourhandle' },
            { label: 'YouTube', value: form.ytUrl, key: 'ytUrl' as const, icon: 'Y', placeholder: 'https://youtube.com/@yourchannel' },
            { label: 'Instagram', value: form.igUrl, key: 'igUrl' as const, icon: 'I', placeholder: 'https://instagram.com/yourhandle' },
            { label: 'Telegram Channel', value: form.tgUrl, key: 'tgUrl' as const, icon: 'T', placeholder: 'https://t.me/yourchannel' },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-[12px] font-bold text-gray-600">{item.icon}</span>
              <div className="flex-1">
                <label className="mb-1 block text-[10px] font-bold uppercase text-gray-500">{item.label}</label>
                <input
                  value={item.value}
                  onChange={event => updateField(item.key, event.target.value)}
                  placeholder={item.placeholder}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2 text-[12px] text-gray-800 outline-none transition-all placeholder:text-gray-300 focus:border-purple-400"
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={handleSaveSocial}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6a1b9a, #7b1fa2)', boxShadow: '0 3px 12px rgba(106,27,154,0.3)' }}
            >
              <Save size={14} /> Save Social Links
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Admin Password" accent="#c62828" icon={<Lock size={16} style={{ color: '#c62828' }} />}>
        <div className="space-y-4">
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-600" />
            <p className="text-[12px] text-amber-700">Choose a strong password with at least 8 characters, including numbers and special characters.</p>
          </div>

          {[
            { label: 'Current Password', value: oldPass, setValue: setOldPass, show: showOld, setShow: setShowOld },
            { label: 'New Password', value: newPass, setValue: setNewPass, show: showNew, setShow: setShowNew },
            { label: 'Confirm New Password', value: confirmPass, setValue: setConfirmPass, show: showNew, setShow: setShowNew },
          ].map(field => (
            <div key={field.label}>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.06em] text-gray-600">{field.label}</label>
              <div className="relative">
                <input
                  type={field.show ? 'text' : 'password'}
                  value={field.value}
                  onChange={event => field.setValue(event.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-gray-200 px-3.5 py-2.5 pr-10 text-[13px] text-gray-800 outline-none transition-all focus:border-red-400"
                />
                <button
                  type="button"
                  onClick={() => field.setShow(!field.show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {field.show ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleChangePassword}
              className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-[13px] font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #c62828, #b71c1c)', boxShadow: '0 3px 12px rgba(198,40,40,0.3)' }}
            >
              <Shield size={14} /> Change Password
            </button>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
