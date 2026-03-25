'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getAdminAnnouncement, createAnnouncement, updateAnnouncement } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { RichTextEditor } from '@/components/rich-text-editor';
import { toast } from 'sonner';
import { format } from 'date-fns';
import {
  ArrowLeft, Loader2, Save, Plus, Trash2, X, Calendar, Clock,
  Search as SearchIcon, Globe, Home, Tag, History,
} from 'lucide-react';
import type { Announcement, ContentType, AnnouncementStatus, ImportantDate } from '@/lib/types';

interface AnnouncementFormProps {
  id?: string;
}

interface FormState {
  title: string;
  type: ContentType;
  category: string;
  organization: string;
  content: string;
  externalLink: string;
  location: string;
  deadline: string;
  minQualification: string;
  ageLimit: string;
  applicationFee: string;
  salaryMin: string;
  salaryMax: string;
  totalPosts: string;
  difficulty: string;
  cutoffMarks: string;
  status: AnnouncementStatus;
  publishAt: string;
  tags: string[];
  importantDates: ImportantDate[];
  seo: {
    metaTitle: string;
    metaDescription: string;
    canonical: string;
    indexPolicy: 'index' | 'noindex';
    ogImage: string;
  };
  home: {
    section: string;
    stickyRank: string;
    highlight: boolean;
    trendingScore: string;
  };
}

const INITIAL_FORM: FormState = {
  title: '',
  type: 'job',
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
  difficulty: '',
  cutoffMarks: '',
  status: 'draft',
  publishAt: '',
  tags: [],
  importantDates: [],
  seo: { metaTitle: '', metaDescription: '', canonical: '', indexPolicy: 'index', ogImage: '' },
  home: { section: '', stickyRank: '', highlight: false, trendingScore: '' },
};

export function AnnouncementForm({ id }: AnnouncementFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = Boolean(id);

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['admin-announcement', id],
    queryFn: () => getAdminAnnouncement(id!),
    enabled: isEdit,
  });

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [tagInput, setTagInput] = useState('');

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
        difficulty: a.difficulty || '',
        cutoffMarks: a.cutoffMarks || '',
        status: a.status || 'draft',
        publishAt: a.publishAt ? a.publishAt.split('T').slice(0, 2).join('T').slice(0, 16) : '',
        tags: a.tags?.map(t => (typeof t === 'string' ? t : t.name)) || [],
        importantDates: a.importantDates?.map(d => ({
          eventName: d.eventName,
          eventDate: typeof d.eventDate === 'string' ? d.eventDate.split('T')[0] : d.eventDate,
          description: d.description || '',
        })) || [],
        seo: {
          metaTitle: a.seo?.metaTitle || '',
          metaDescription: a.seo?.metaDescription || '',
          canonical: a.seo?.canonical || '',
          indexPolicy: a.seo?.indexPolicy || 'index',
          ogImage: a.seo?.ogImage || '',
        },
        home: {
          section: a.home?.section || '',
          stickyRank: a.home?.stickyRank?.toString() || '',
          highlight: a.home?.highlight || false,
          trendingScore: a.home?.trendingScore?.toString() || '',
        },
      });
    }
  }, [existing]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        title: form.title,
        type: form.type,
        category: form.category,
        organization: form.organization,
        content: form.content,
        status: form.status,
        location: form.location || undefined,
        minQualification: form.minQualification || undefined,
        ageLimit: form.ageLimit || undefined,
        applicationFee: form.applicationFee || undefined,
        difficulty: form.difficulty || undefined,
        cutoffMarks: form.cutoffMarks || undefined,
      };

      if (form.externalLink) payload.externalLink = form.externalLink;
      if (form.deadline) payload.deadline = form.deadline;
      if (form.salaryMin) payload.salaryMin = Number(form.salaryMin);
      if (form.salaryMax) payload.salaryMax = Number(form.salaryMax);
      if (form.totalPosts) payload.totalPosts = Number(form.totalPosts);
      if (form.publishAt) payload.publishAt = form.publishAt;
      if (form.tags.length > 0) payload.tags = form.tags;
      if (form.importantDates.length > 0) payload.importantDates = form.importantDates;

      const seo: Record<string, string> = {};
      if (form.seo.metaTitle) seo.metaTitle = form.seo.metaTitle;
      if (form.seo.metaDescription) seo.metaDescription = form.seo.metaDescription;
      if (form.seo.canonical) seo.canonical = form.seo.canonical;
      if (form.seo.indexPolicy) seo.indexPolicy = form.seo.indexPolicy;
      if (form.seo.ogImage) seo.ogImage = form.seo.ogImage;
      if (Object.keys(seo).length > 0) payload.seo = seo;

      const home: Record<string, unknown> = {};
      if (form.home.section) home.section = form.home.section;
      if (form.home.stickyRank) home.stickyRank = Number(form.home.stickyRank);
      if (form.home.highlight) home.highlight = true;
      if (form.home.trendingScore) home.trendingScore = Number(form.home.trendingScore);
      if (Object.keys(home).length > 0) payload.home = home;

      if (isEdit) {
        return updateAnnouncement(id!, payload as Partial<Announcement>);
      }
      return createAnnouncement(payload as Partial<Announcement>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-announcements'] });
      toast.success(isEdit ? 'Announcement updated!' : 'Announcement created!');
      router.push('/announcements');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.category || !form.organization) {
      toast.error('Title, category, and organization are required.');
      return;
    }
    saveMutation.mutate();
  };

  const updateField = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const updateSeo = (field: string, value: string) => {
    setForm(prev => ({ ...prev, seo: { ...prev.seo, [field]: value } }));
  };

  const updateHome = (field: string, value: unknown) => {
    setForm(prev => ({ ...prev, home: { ...prev.home, [field]: value } }));
  };

  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !form.tags.includes(tag)) {
      setForm(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    setForm(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const addImportantDate = () => {
    setForm(prev => ({
      ...prev,
      importantDates: [...prev.importantDates, { eventName: '', eventDate: '', description: '' }],
    }));
  };

  const updateImportantDate = (index: number, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      importantDates: prev.importantDates.map((d, i) => i === index ? { ...d, [field]: value } : d),
    }));
  };

  const removeImportantDate = (index: number) => {
    setForm(prev => ({
      ...prev,
      importantDates: prev.importantDates.filter((_, i) => i !== index),
    }));
  };

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const versions = existing?.data?.versions || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/announcements')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold tracking-tight">
            {isEdit ? 'Edit Announcement' : 'Create Announcement'}
          </h1>
          <p className="text-muted-foreground mt-1 truncate">
            {isEdit ? `Editing: ${existing?.data?.title}` : 'Create a new announcement'}
          </p>
        </div>
        {isEdit && existing?.data && (
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline">v{existing.data.version || 1}</Badge>
            <span>{existing.data.viewCount?.toLocaleString()} views</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="content" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="seo">SEO</TabsTrigger>
            <TabsTrigger value="home">Home Page</TabsTrigger>
            {isEdit && <TabsTrigger value="history">History</TabsTrigger>}
            {!isEdit && <TabsTrigger value="home" disabled className="hidden">—</TabsTrigger>}
          </TabsList>

          {/* ── Tab: Content ── */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Basic Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input value={form.title} onChange={e => updateField('title', e.target.value)} placeholder="Announcement title" required />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
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
                    <label className="text-sm font-medium">Category *</label>
                    <Input value={form.category} onChange={e => updateField('category', e.target.value)} placeholder="e.g. Railway, Banking" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Organization *</label>
                    <Input value={form.organization} onChange={e => updateField('organization', e.target.value)} placeholder="e.g. RRB, IBPS" required />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={form.status} onValueChange={v => updateField('status', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending Review</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="archived">Archived</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {form.status === 'scheduled' && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Publish At</label>
                      <Input
                        value={form.publishAt}
                        onChange={e => updateField('publishAt', e.target.value)}
                        type="datetime-local"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Content</CardTitle>
                <CardDescription>Use the rich text editor for formatted content</CardDescription>
              </CardHeader>
              <CardContent>
                <RichTextEditor
                  content={form.content}
                  onChange={html => updateField('content', html)}
                  placeholder="Write announcement content..."
                />
              </CardContent>
            </Card>

            {/* Tags */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <CardTitle className="text-base">Tags</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                    placeholder="Add a tag and press Enter..."
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {form.tags.map(tag => (
                      <Badge key={tag} variant="secondary" className="gap-1 pr-1">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)} className="ml-1 hover:text-destructive">
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Important Dates */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <CardTitle className="text-base">Important Dates</CardTitle>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addImportantDate}>
                    <Plus className="h-4 w-4 mr-1" /> Add Date
                  </Button>
                </div>
              </CardHeader>
              {form.importantDates.length > 0 && (
                <CardContent className="space-y-3">
                  {form.importantDates.map((date, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                      <div className="grid gap-3 flex-1 sm:grid-cols-3">
                        <Input
                          value={date.eventName}
                          onChange={e => updateImportantDate(i, 'eventName', e.target.value)}
                          placeholder="Event name"
                        />
                        <Input
                          value={typeof date.eventDate === 'string' ? date.eventDate : ''}
                          onChange={e => updateImportantDate(i, 'eventDate', e.target.value)}
                          type="date"
                        />
                        <Input
                          value={date.description || ''}
                          onChange={e => updateImportantDate(i, 'description', e.target.value)}
                          placeholder="Description (optional)"
                        />
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeImportantDate(i)} className="shrink-0 text-destructive hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </CardContent>
              )}
            </Card>
          </TabsContent>

          {/* ── Tab: Details ── */}
          <TabsContent value="details" className="space-y-6">
            <Card>
              <CardHeader><CardTitle className="text-base">Links & Logistics</CardTitle></CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Vacancy & Compensation</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Total Posts</label>
                    <Input value={form.totalPosts} onChange={e => updateField('totalPosts', e.target.value)} type="number" min="0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Age Limit</label>
                    <Input value={form.ageLimit} onChange={e => updateField('ageLimit', e.target.value)} placeholder="e.g. 18-35" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Application Fee</label>
                    <Input value={form.applicationFee} onChange={e => updateField('applicationFee', e.target.value)} placeholder="e.g. Gen: 500, SC/ST: 250" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Salary Min (₹)</label>
                    <Input value={form.salaryMin} onChange={e => updateField('salaryMin', e.target.value)} type="number" min="0" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Salary Max (₹)</label>
                    <Input value={form.salaryMax} onChange={e => updateField('salaryMax', e.target.value)} type="number" min="0" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base">Exam Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Difficulty</label>
                    <Select value={form.difficulty || 'none'} onValueChange={v => updateField('difficulty', v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not specified</SelectItem>
                        <SelectItem value="easy">Easy</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="hard">Hard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Cutoff Marks</label>
                    <Input value={form.cutoffMarks} onChange={e => updateField('cutoffMarks', e.target.value)} placeholder="e.g. Gen: 90, OBC: 80" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: SEO ── */}
          <TabsContent value="seo" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <SearchIcon className="h-4 w-4" />
                  <CardTitle className="text-base">Search Engine Optimization</CardTitle>
                </div>
                <CardDescription>Control how this announcement appears in search results</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meta Title</label>
                  <Input
                    value={form.seo.metaTitle}
                    onChange={e => updateSeo('metaTitle', e.target.value)}
                    placeholder="Custom title for search engines (leave blank to use announcement title)"
                    maxLength={70}
                  />
                  <p className="text-xs text-muted-foreground">{form.seo.metaTitle.length}/70 characters</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Meta Description</label>
                  <Textarea
                    value={form.seo.metaDescription}
                    onChange={e => updateSeo('metaDescription', e.target.value)}
                    placeholder="Summary for search engine snippets"
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-muted-foreground">{form.seo.metaDescription.length}/160 characters</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Canonical URL</label>
                    <Input
                      value={form.seo.canonical}
                      onChange={e => updateSeo('canonical', e.target.value)}
                      placeholder="https://sarkariexams.me/..."
                      type="url"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Index Policy</label>
                    <Select value={form.seo.indexPolicy} onValueChange={v => updateSeo('indexPolicy', v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="index">Index (visible to search engines)</SelectItem>
                        <SelectItem value="noindex">No Index (hidden from search engines)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">OG Image URL</label>
                  <Input
                    value={form.seo.ogImage}
                    onChange={e => updateSeo('ogImage', e.target.value)}
                    placeholder="https://sarkariexams.me/images/og-banner.jpg"
                    type="url"
                  />
                </div>

                {/* SEO Preview */}
                {(form.seo.metaTitle || form.title) && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">SEARCH PREVIEW</p>
                      <div className="rounded-lg border p-4 bg-background space-y-1">
                        <p className="text-blue-600 text-lg leading-tight truncate">
                          {form.seo.metaTitle || form.title}
                        </p>
                        <p className="text-sm text-green-700 truncate">
                          {form.seo.canonical || `sarkariexams.me/${form.type}/${form.title.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {form.seo.metaDescription || `${form.organization} - ${form.category} - ${form.title}`}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: Home Page ── */}
          <TabsContent value="home" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4" />
                  <CardTitle className="text-base">Home Page Curation</CardTitle>
                </div>
                <CardDescription>Control how this announcement appears on the home page</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Home Section</label>
                    <Select value={form.home.section || 'none'} onValueChange={v => updateHome('section', v === 'none' ? '' : v)}>
                      <SelectTrigger><SelectValue placeholder="Select section..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Not on home page</SelectItem>
                        <SelectItem value="latest">Latest Updates</SelectItem>
                        <SelectItem value="trending">Trending</SelectItem>
                        <SelectItem value="featured">Featured</SelectItem>
                        <SelectItem value="important">Important</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Sticky Rank</label>
                    <Input
                      value={form.home.stickyRank}
                      onChange={e => updateHome('stickyRank', e.target.value)}
                      type="number"
                      min="0"
                      placeholder="Lower = higher position"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Trending Score</label>
                    <Input
                      value={form.home.trendingScore}
                      onChange={e => updateHome('trendingScore', e.target.value)}
                      type="number"
                      min="0"
                      placeholder="Higher = more prominent"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <p className="text-sm font-medium">Highlight</p>
                      <p className="text-xs text-muted-foreground">Show with highlight badge</p>
                    </div>
                    <Switch
                      checked={form.home.highlight}
                      onCheckedChange={v => updateHome('highlight', v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Tab: History ── */}
          {isEdit && (
            <TabsContent value="history" className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    <CardTitle className="text-base">Version History</CardTitle>
                  </div>
                  <CardDescription>
                    {versions.length} version{versions.length !== 1 ? 's' : ''} recorded
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {versions.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No version history available.</p>
                  ) : (
                    <div className="space-y-3">
                      {versions.map((v, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-xs font-bold shrink-0">
                            v{v.version}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium">Version {v.version}</span>
                              <span className="text-xs text-muted-foreground">
                                {v.updatedAt ? format(new Date(v.updatedAt), 'MMM d, yyyy HH:mm') : '—'}
                              </span>
                              {v.updatedBy && (
                                <Badge variant="outline" className="text-xs">{v.updatedBy}</Badge>
                              )}
                            </div>
                            {v.note && <p className="text-sm text-muted-foreground mt-1">{v.note}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>

        {/* Sticky Save Bar */}
        <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t -mx-4 px-4 py-3 mt-6 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 flex items-center gap-3">
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
            {isEdit ? 'Update' : 'Create'} Announcement
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push('/announcements')}>Cancel</Button>
          {isEdit && existing?.data?.slug && (
            <a
              href={`/${existing.data.type}/${existing.data.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Globe className="h-3.5 w-3.5" /> View Live
            </a>
          )}
        </div>
      </form>
    </div>
  );
}
