'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSettings, updateSettings } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Loader2, Save, CheckCircle2 } from 'lucide-react';
import type { SiteSettings } from '@/lib/types';

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [saved, setSaved] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: async () => {
      const res = await getSettings();
      return res.data as SiteSettings;
    },
  });

  const [form, setForm] = useState<Partial<SiteSettings>>({});

  useEffect(() => {
    if (data) {
      setForm(data);
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () => updateSettings(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-settings'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const updateField = (field: string, value: string | boolean) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage site configuration</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {saveMutation.error && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {(saveMutation.error as Error)?.message || 'Failed to save settings'}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 rounded-lg border border-success/50 bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="h-4 w-4" />
            Settings saved successfully
          </div>
        )}

        {/* General */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
            <CardDescription>Basic site information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Site Name</label>
              <Input value={form.siteName || ''} onChange={e => updateField('siteName', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Site Description</label>
              <Textarea value={form.siteDescription || ''} onChange={e => updateField('siteDescription', e.target.value)} rows={3} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact Email</label>
              <Input value={form.contactEmail || ''} onChange={e => updateField('contactEmail', e.target.value)} type="email" />
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">SEO</CardTitle>
            <CardDescription>Search engine optimization settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Meta Title</label>
              <Input value={form.defaultMetaTitle || ''} onChange={e => updateField('defaultMetaTitle', e.target.value)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Default Meta Description</label>
              <Textarea value={form.defaultMetaDescription || ''} onChange={e => updateField('defaultMetaDescription', e.target.value)} rows={2} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Google Analytics ID</label>
              <Input value={form.googleAnalyticsId || ''} onChange={e => updateField('googleAnalyticsId', e.target.value)} placeholder="G-XXXXXXXXXX" />
            </div>
          </CardContent>
        </Card>

        {/* Social */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Social Links</CardTitle>
            <CardDescription>Social media profile URLs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Twitter URL</label>
              <Input value={form.twitterUrl || ''} onChange={e => updateField('twitterUrl', e.target.value)} placeholder="https://twitter.com/..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Telegram URL</label>
              <Input value={form.telegramUrl || ''} onChange={e => updateField('telegramUrl', e.target.value)} placeholder="https://t.me/..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">YouTube URL</label>
              <Input value={form.youtubeUrl || ''} onChange={e => updateField('youtubeUrl', e.target.value)} placeholder="https://youtube.com/..." />
            </div>
          </CardContent>
        </Card>

        {/* Feature Flags */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Feature Flags</CardTitle>
            <CardDescription>Toggle site features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.maintenanceMode || false}
                onChange={e => updateField('maintenanceMode', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <div>
                <p className="text-sm font-medium">Maintenance Mode</p>
                <p className="text-xs text-muted-foreground">Show maintenance page to visitors</p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.registrationEnabled !== false}
                onChange={e => updateField('registrationEnabled', e.target.checked)}
                className="h-4 w-4 rounded border-input"
              />
              <div>
                <p className="text-sm font-medium">Registration Enabled</p>
                <p className="text-xs text-muted-foreground">Allow new users to register</p>
              </div>
            </label>
          </CardContent>
        </Card>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
