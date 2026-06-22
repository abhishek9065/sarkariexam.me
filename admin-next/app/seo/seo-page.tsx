'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle,
  FilePenLine,
  FileText,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { toast } from 'sonner';

import { generateMetaWithAI, getCmsPosts, getSEOMetrics, updateCmsPost } from '@/lib/api';
import type { CmsPost, ContentType, EditorialStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

type IssueType = 'meta-title' | 'meta-description' | 'canonical' | 'schema';
type IssueFilter = 'all' | IssueType;
type SeoIssue = {
  id: string;
  type: Exclude<IssueType, 'schema'>;
  label: string;
  description: string;
  post: CmsPost;
};
type MetaDraft = { metaTitle: string; metaDescription: string };

const contentTypes: Array<{ value: ContentType; label: string }> = [
  { value: 'job', label: 'Job' },
  { value: 'result', label: 'Result' },
  { value: 'admit-card', label: 'Admit Card' },
  { value: 'admission', label: 'Admission' },
  { value: 'answer-key', label: 'Answer Key' },
  { value: 'syllabus', label: 'Syllabus' },
];

const statuses: Array<{ value: EditorialStatus; label: string }> = [
  { value: 'draft', label: 'Draft' },
  { value: 'in_review', label: 'In Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const issueLabels: Record<Exclude<IssueType, 'schema'>, string> = {
  'meta-title': 'Missing meta title',
  'meta-description': 'Missing meta description',
  canonical: 'Missing canonical path',
};

async function loadCmsInventory(type: 'all' | ContentType, status: 'all' | EditorialStatus) {
  const pageSize = 100;
  const posts: CmsPost[] = [];
  let total = 0;

  do {
    const response = await getCmsPosts({
      type: type === 'all' ? undefined : type,
      status,
      sort: 'updated',
      limit: pageSize,
      offset: posts.length,
    });
    posts.push(...response.data);
    total = response.total;
    if (response.data.length === 0) break;
  } while (posts.length < total);

  return { posts, total };
}

function deriveIssues(posts: CmsPost[]): SeoIssue[] {
  return posts.flatMap((post) => {
    const issues: SeoIssue[] = [];
    if (!post.seo?.metaTitle?.trim()) {
      issues.push({
        id: `${post.id}:meta-title`,
        type: 'meta-title',
        label: issueLabels['meta-title'],
        description: 'This post relies on its page-title fallback instead of stored SEO metadata.',
        post,
      });
    }
    if (!post.seo?.metaDescription?.trim()) {
      issues.push({
        id: `${post.id}:meta-description`,
        type: 'meta-description',
        label: issueLabels['meta-description'],
        description: 'This post relies on its summary fallback instead of a stored meta description.',
        post,
      });
    }
    if (!post.seo?.canonicalPath?.trim()) {
      issues.push({
        id: `${post.id}:canonical`,
        type: 'canonical',
        label: issueLabels.canonical,
        description: `The generated fallback is ${post.seo?.effectiveCanonicalPath || 'available only at render time'}.`,
        post,
      });
    }
    return issues;
  });
}

function QueryError({ message, retry }: { message: string; retry: () => void }) {
  return (
    <Card>
      <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-7 w-7 text-destructive" />
        <p className="text-sm text-muted-foreground">{message}</p>
        <Button type="button" variant="outline" onClick={retry}><RefreshCw className="h-4 w-4" />Retry</Button>
      </CardContent>
    </Card>
  );
}

export function SEODashboardPage() {
  const queryClient = useQueryClient();
  const [issueType, setIssueType] = useState<IssueFilter>('all');
  const [postType, setPostType] = useState<'all' | ContentType>('all');
  const [status, setStatus] = useState<'all' | EditorialStatus>('all');
  const [metaTarget, setMetaTarget] = useState<CmsPost | null>(null);
  const [metaDraft, setMetaDraft] = useState<MetaDraft>({ metaTitle: '', metaDescription: '' });

  const metricsQuery = useQuery({
    queryKey: ['admin-seo'],
    queryFn: async () => (await getSEOMetrics()).data,
  });
  const inventoryQuery = useQuery({
    queryKey: ['seo-cms-inventory', postType, status],
    queryFn: () => loadCmsInventory(postType, status),
  });

  const generateMutation = useMutation({
    mutationFn: (post: CmsPost) => generateMetaWithAI({
      title: post.title,
      content: post.body?.trim() || post.summary,
      organization: post.organization?.name,
    }),
    onSuccess: (response, post) => {
      setMetaTarget(post);
      setMetaDraft({
        metaTitle: post.seo?.metaTitle?.trim() || response.data.metaTitle,
        metaDescription: post.seo?.metaDescription?.trim() || response.data.metaDescription,
      });
    },
    onError: (error: Error) => toast.error(error.message || 'Meta generation failed.'),
  });

  const saveMetaMutation = useMutation({
    mutationFn: ({ post, draft }: { post: CmsPost; draft: MetaDraft }) => updateCmsPost(post.id, {
      seo: {
        metaTitle: draft.metaTitle.trim(),
        metaDescription: draft.metaDescription.trim(),
        canonicalPath: post.seo?.canonicalPath,
        indexable: post.seo?.indexable,
        ogImage: post.seo?.ogImage,
      },
      versionNote: 'SEO metadata updated from SEO dashboard',
    }),
    onSuccess: () => {
      setMetaTarget(null);
      void queryClient.invalidateQueries({ queryKey: ['seo-cms-inventory'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-seo'] });
      toast.success('SEO metadata saved.');
    },
    onError: (error: Error) => toast.error(error.message || 'Failed to save SEO metadata.'),
  });

  const allIssues = useMemo(() => deriveIssues(inventoryQuery.data?.posts ?? []), [inventoryQuery.data?.posts]);
  const visibleIssues = useMemo(
    () => issueType === 'all' ? allIssues : issueType === 'schema' ? [] : allIssues.filter((issue) => issue.type === issueType),
    [allIssues, issueType],
  );
  const issueCounts = useMemo(() => ({
    title: allIssues.filter((issue) => issue.type === 'meta-title').length,
    description: allIssues.filter((issue) => issue.type === 'meta-description').length,
    canonical: allIssues.filter((issue) => issue.type === 'canonical').length,
  }), [allIssues]);

  if (metricsQuery.isLoading && inventoryQuery.isLoading) {
    return <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  const seo = metricsQuery.data;
  const metrics = seo?.metrics;
  const coverage = seo?.coverage;
  const queries = seo?.queries ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">SEO Dashboard</h1>
          <p className="mt-1 text-muted-foreground">Find persisted metadata gaps and open the affected content for repair.</p>
        </div>
        <Button type="button" variant="outline" disabled={metricsQuery.isFetching || inventoryQuery.isFetching} onClick={() => { void metricsQuery.refetch(); void inventoryQuery.refetch(); }}>
          <RefreshCw className={`h-4 w-4 ${(metricsQuery.isFetching || inventoryQuery.isFetching) ? 'animate-spin' : ''}`} />
          Recheck
        </Button>
      </div>

      {metricsQuery.isError ? <QueryError message="SEO metrics are unavailable from the current API." retry={() => void metricsQuery.refetch()} /> : (
        <>
          <Card className="border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm font-medium text-muted-foreground">SEO Health Score</p><p className="text-4xl font-bold">{metrics?.healthScore ?? 0}%</p></div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10"><CheckCircle className="h-8 w-8 text-primary" /></div>
              </div>
              <Progress value={metrics?.healthScore ?? 0} className="mt-4" />
            </CardContent>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Total Pages</CardTitle><FileText className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics?.total?.toLocaleString('en-IN') ?? 0}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">With Meta Description</CardTitle><CheckCircle className="h-4 w-4 text-green-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics?.withMeta?.toLocaleString('en-IN') ?? 0}</div><p className="text-xs text-muted-foreground">{metrics?.total ? Math.round((metrics.withMeta / metrics.total) * 100) : 0}% coverage</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Indexable</CardTitle><Globe className="h-4 w-4 text-blue-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics?.indexed?.toLocaleString('en-IN') ?? 0}</div><p className="text-xs text-muted-foreground">{metrics?.total ? Math.round((metrics.indexed / metrics.total) * 100) : 0}% indexable</p></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Canonical Configured</CardTitle><TrendingUp className="h-4 w-4 text-purple-500" /></CardHeader><CardContent><div className="text-2xl font-bold">{metrics?.withSchema?.toLocaleString('en-IN') ?? 0}</div><p className="text-xs text-muted-foreground">{metrics?.total ? Math.round((metrics.withSchema / metrics.total) * 100) : 0}% explicit canonical</p></CardContent></Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle className="text-base">Index Coverage</CardTitle><CardDescription>Persisted index policy reported by the SEO API</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {[{ label: 'Indexed', value: coverage?.indexed ?? 0, color: 'text-green-500' }, { label: 'Noindex', value: coverage?.noindex ?? 0, color: 'text-yellow-500' }, { label: 'Missing policy', value: coverage?.missing ?? 0, color: 'text-red-500' }].map((item) => (
                  <div key={item.label} className="space-y-2"><div className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><CheckCircle className={`h-4 w-4 ${item.color}`} />{item.label}</span><span className="font-medium">{item.value}</span></div><Progress value={metrics?.total ? (item.value / metrics.total) * 100 : 0} className="h-2" /></div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Search className="h-4 w-4" />Top Search Queries</CardTitle><CardDescription>Most searched terms in the last 30 days</CardDescription></CardHeader>
              <CardContent>
                {queries.length === 0 ? <p className="py-8 text-center text-muted-foreground">No search data available</p> : <div className="max-h-64 space-y-2 overflow-y-auto">{queries.slice(0, 20).map((query, index) => <div key={`${query._id}:${index}`} className="flex items-center justify-between rounded p-2 hover:bg-muted"><div className="flex min-w-0 items-center gap-3"><span className="w-6 text-sm text-muted-foreground">#{index + 1}</span><span className="truncate font-medium">{query._id}</span></div><Badge variant="secondary">{query.count} searches</Badge></div>)}</div>}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">SEO Issue Workflow</CardTitle>
          <CardDescription>Issues are derived from stored CMS SEO fields. Effective runtime fallbacks are not counted as fixed metadata.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Select value={issueType} onValueChange={(value) => setIssueType(value as IssueFilter)}><SelectTrigger><SelectValue placeholder="Issue type" /></SelectTrigger><SelectContent><SelectItem value="all">All issue types</SelectItem><SelectItem value="meta-title">Missing meta title</SelectItem><SelectItem value="meta-description">Missing meta description</SelectItem><SelectItem value="canonical">Missing canonical / policy</SelectItem><SelectItem value="schema">Missing schema</SelectItem></SelectContent></Select>
            <Select value={postType} onValueChange={(value) => setPostType(value as 'all' | ContentType)}><SelectTrigger><SelectValue placeholder="Post type" /></SelectTrigger><SelectContent><SelectItem value="all">All post types</SelectItem>{contentTypes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
            <Select value={status} onValueChange={(value) => setStatus(value as 'all' | EditorialStatus)}><SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger><SelectContent><SelectItem value="all">All statuses</SelectItem>{statuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
          </div>

          {issueType !== 'schema' && !inventoryQuery.isError ? (
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground"><Badge variant="outline">{issueCounts.title} missing titles</Badge><Badge variant="outline">{issueCounts.description} missing descriptions</Badge><Badge variant="outline">{issueCounts.canonical} missing canonicals</Badge><span className="self-center">Scanned {inventoryQuery.data?.posts.length ?? 0} of {inventoryQuery.data?.total ?? 0} matching posts.</span></div>
          ) : null}

          {inventoryQuery.isLoading ? <div className="flex min-h-52 items-center justify-center"><Loader2 className="h-7 w-7 animate-spin text-muted-foreground" /></div> : inventoryQuery.isError ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center"><AlertTriangle className="h-7 w-7 text-destructive" /><p className="font-medium">Issue list unavailable from current APIs</p><p className="text-sm text-muted-foreground">CMS post inventory could not be loaded.</p><Button type="button" variant="outline" onClick={() => void inventoryQuery.refetch()}><RefreshCw className="h-4 w-4" />Retry</Button></div>
          ) : issueType === 'schema' ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-2 text-center"><AlertTriangle className="h-7 w-7 text-amber-500" /><p className="font-medium">Issue list unavailable from current APIs</p><p className="max-w-xl text-sm text-muted-foreground">The CMS post response does not expose persisted schema markup, so missing-schema issues cannot be determined without inventing results.</p></div>
          ) : visibleIssues.length === 0 ? (
            <div className="flex min-h-52 flex-col items-center justify-center gap-2 text-center"><CheckCircle className="h-7 w-7 text-emerald-600" /><p className="font-medium">No SEO issues found</p><p className="text-sm text-muted-foreground">No matching persisted metadata gaps were found for these filters.</p></div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full min-w-205 text-sm">
                <thead className="bg-muted/60 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Post</th><th className="px-4 py-3">Issue</th><th className="px-4 py-3">Type / Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
                <tbody>{visibleIssues.map((issue) => <tr key={issue.id} className="border-t border-border align-top"><td className="max-w-[320px] px-4 py-3"><p className="font-semibold">{issue.post.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">/{issue.post.slug}</p></td><td className="max-w-90 px-4 py-3"><Badge variant="outline" className="mb-1">{issue.label}</Badge><p className="text-xs leading-5 text-muted-foreground">{issue.description}</p></td><td className="px-4 py-3"><p className="capitalize">{issue.post.type.replace('-', ' ')}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{issue.post.status.replace('_', ' ')}</p></td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Button asChild type="button" size="sm" variant="outline"><Link href={`/announcements/${issue.post.id}`}><FilePenLine className="h-4 w-4" />Open / edit</Link></Button>{issue.type === 'meta-title' || issue.type === 'meta-description' ? <Button type="button" size="sm" disabled={generateMutation.isPending} onClick={() => generateMutation.mutate(issue.post)}>{generateMutation.isPending && generateMutation.variables?.id === issue.post.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Generate meta</Button> : null}</div></td></tr>)}</tbody>
              </table>
            </div>
          )}

          <p className="text-xs leading-5 text-muted-foreground">Bulk generation is intentionally unavailable because the backend exposes only a single-post AI helper. Explicit-vs-default index policy and schema markup are not present in CMS list data.</p>
        </CardContent>
      </Card>

      <Dialog open={Boolean(metaTarget)} onOpenChange={(open) => { if (!open && !saveMetaMutation.isPending) setMetaTarget(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Review generated metadata</DialogTitle><DialogDescription>Nothing is marked fixed until these values are saved to {metaTarget?.title}.</DialogDescription></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5"><label htmlFor="seo-meta-title" className="text-sm font-semibold">Meta title</label><Input id="seo-meta-title" value={metaDraft.metaTitle} maxLength={160} onChange={(event) => setMetaDraft((current) => ({ ...current, metaTitle: event.target.value }))} /><p className="text-right text-xs text-muted-foreground">{metaDraft.metaTitle.length}/160</p></div>
            <div className="space-y-1.5"><label htmlFor="seo-meta-description" className="text-sm font-semibold">Meta description</label><Textarea id="seo-meta-description" value={metaDraft.metaDescription} maxLength={320} rows={5} onChange={(event) => setMetaDraft((current) => ({ ...current, metaDescription: event.target.value }))} /><p className="text-right text-xs text-muted-foreground">{metaDraft.metaDescription.length}/320</p></div>
          </div>
          <DialogFooter><Button type="button" variant="outline" disabled={saveMetaMutation.isPending} onClick={() => setMetaTarget(null)}>Cancel</Button><Button type="button" disabled={saveMetaMutation.isPending || !metaTarget || !metaDraft.metaTitle.trim() || !metaDraft.metaDescription.trim()} onClick={() => { if (metaTarget) saveMetaMutation.mutate({ post: metaTarget, draft: metaDraft }); }}>{saveMetaMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}Save metadata</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
