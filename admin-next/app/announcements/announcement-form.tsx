'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminAnnouncement, createAnnouncement, updateAnnouncement } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import type { Announcement, ContentType, AnnouncementStatus } from '@/lib/types';

interface AnnouncementFormProps {
  id?: string;
}

export function AnnouncementForm({ id }: AnnouncementFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['admin-announcement', id],
    queryFn: () => getAdminAnnouncement(id!),
    enabled: isEdit,
  });

  const [form, setForm] = useState({
    title: '',
    type: 'job' as ContentType,
    category: '',
    organization: '',
    content: '',
    externalLink: '',
    location: '',
    deadline: '',
    minQualification: '',
    ageLimit: '',
    applicationFee: '',
    salaryMin: '',
    salaryMax: '',
    totalPosts: '',
    status: 'draft' as AnnouncementStatus,
  });

  useEffect(() => {
    if (existing?.data) {
      const a = existing.data;
      setForm({
        title: a.title || '',
        type: a.type || 'job',
        category: a.category || '',
        organization: a.organization || '',
        content: a.content || '',
        externalLink: a.externalLink || '',
        location: a.location || '',
        deadline: a.deadline ? a.deadline.split('T')[0] : '',
        minQualification: a.minQualification || '',
        ageLimit: a.ageLimit || '',
        applicationFee: a.applicationFee || '',
        salaryMin: a.salaryMin?.toString() || '',
        salaryMax: a.salaryMax?.toString() || '',
        totalPosts: a.totalPosts?.toString() || '',
        status: a.status || 'draft',
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = { ...form };
      if (payload.salaryMin) payload.salaryMin = Number(payload.salaryMin);
      else delete payload.salaryMin;
      if (payload.salaryMax) payload.salaryMax = Number(payload.salaryMax);
      else delete payload.salaryMax;
      if (payload.totalPosts) payload.totalPosts = Number(payload.totalPosts);
      else delete payload.totalPosts;
      if (!payload.externalLink) delete payload.externalLink;
      if (!payload.deadline) delete payload.deadline;

      if (isEdit) {
        return updateAnnouncement(id!, payload as Partial<Announcement>);
      }
      return createAnnouncement(payload as Partial<Announcement>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      router.push('/announcements');
    },
  });

  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.organization) {
      setError('Title, category, and organization are required.');
      return;
    }
    setError('');
    saveMutation.mutate();
  };

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/announcements')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? 'Edit Announcement' : 'Create Announcement'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? `Editing: ${existing?.data?.title}` : 'Create a new announcement'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {(error || saveMutation.error) && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error || (saveMutation.error as Error)?.message || 'Save failed'}
          </div>
        )}

        {/* Basic Info */}
        <Card>
          <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Title *</label>
              <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Announcement title" required />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Type *</label>
                <Select value={form.type} onValueChange={v => updateField('type', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="job">Job</SelectItem>
                    <SelectItem value="result">Result</SelectItem>
                    <SelectItem value="admit-card">Admit Card</SelectItem>
                    <SelectItem value="syllabus">Syllabus</SelectItem>
                    <SelectItem value="answer-key">Answer Key</SelectItem>
                    <SelectItem value="admission">Admission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={form.status} onValueChange={v => updateField('status', v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="scheduled">Scheduled</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category *</label>
                <Input value={form.category} onChange={e => updateField('category', e.target.value)} placeholder="e.g. Railway, Banking" required />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Organization *</label>
                <Input value={form.organization} onChange={e => updateField('organization', e.target.value)} placeholder="e.g. RRB, IBPS" required />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Details */}
        <Card>
          <CardHeader><CardTitle className="text-base">Details</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Content</label>
              <Textarea value={form.content} onChange={e => updateField('content', e.target.value)} placeholder="Announcement content / description" rows={6} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">External Link</label>
                <Input value={form.externalLink} onChange={e => updateField('externalLink', e.target.value)} placeholder="https://..." type="url" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Deadline</label>
                <Input value={form.deadline} onChange={e => updateField('deadline', e.target.value)} type="date" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Location</label>
                <Input value={form.location} onChange={e => updateField('location', e.target.value)} placeholder="e.g. All India, Delhi" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Min Qualification</label>
                <Input value={form.minQualification} onChange={e => updateField('minQualification', e.target.value)} placeholder="e.g. Graduate, 10th Pass" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Age Limit</label>
                <Input value={form.ageLimit} onChange={e => updateField('ageLimit', e.target.value)} placeholder="e.g. 18-35" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Application Fee</label>
                <Input value={form.applicationFee} onChange={e => updateField('applicationFee', e.target.value)} placeholder="e.g. Gen: 500, SC/ST: 250" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Total Posts</label>
                <Input value={form.totalPosts} onChange={e => updateField('totalPosts', e.target.value)} type="number" min="0" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Salary Min</label>
                <Input value={form.salaryMin} onChange={e => updateField('salaryMin', e.target.value)} type="number" min="0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Salary Max</label>
                <Input value={form.salaryMax} onChange={e => updateField('salaryMax', e.target.value)} type="number" min="0" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isEdit ? 'Update' : 'Create'} Announcement
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/announcements')}>Cancel</Button>
        </div>
      </form>
    </div>
  );
}
