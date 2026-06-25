'use client';

import Link from 'next/link';
import type { ComponentType } from 'react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  CalendarX2,
  CheckCircle2,
  DatabaseZap,
  FilePenLine,
  FileText,
  Landmark,
  Link2Off,
  Loader2,
  RefreshCw,
  SearchX,
  Tags,
} from 'lucide-react';

import { getCmsPosts } from '@/lib/api';
import type { CmsPost, ContentType, EditorialStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type IssueKind =
  | 'missing-official-source'
  | 'missing-deadline'
  | 'invalid-deadline'
  | 'expired-published'
  | 'missing-organization'
  | 'missing-taxonomy'
  | 'missing-seo'
  | 'stale-content'
  | 'duplicate-slug'
  | 'readiness';

type IssueFilter = 'all' | IssueKind;

type DataQualityIssue = {
  id: string;
  kind: IssueKind;
  label: string;
  detail: string;
  post: CmsPost;
};

type MetricCard = {
  key: IssueKind;
  label: string;
  value?: number;
  description: string;
  unavailable?: boolean;
  icon: ComponentType<{ className?: string }>;
};

const UNAVAILABLE = 'Unavailable from current APIs.';
const APPLICATION_DEADLINE_TYPES = new Set<ContentType>(['job', 'admission']);
const EMPTY_POSTS: CmsPost[] = [];

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

const issueOptions: Array<{ value: IssueFilter; label: string }> = [
  { value: 'all', label: 'All issue kinds' },
  { value: 'missing-official-source', label: 'Missing official source' },
  { value: 'missing-deadline', label: 'Missing last date' },
  { value: 'invalid-deadline', label: 'Invalid deadline' },
  { value: 'expired-published', label: 'Expired but still published' },
  { value: 'missing-organization', label: 'Missing organization' },
  { value: 'missing-taxonomy', label: 'Missing category / state / type' },
  { value: 'missing-seo', label: 'Missing SEO metadata' },
  { value: 'stale-content', label: 'Stale content' },
  { value: 'duplicate-slug', label: 'Duplicate slug' },
  { value: 'readiness', label: 'Content readiness issues' },
];

async function loadCmsInventory(type: 'all' | ContentType, status: 'all' | EditorialStatus) {
  const pageSize = 100;
  const posts: CmsPost[] = [];
  let total = 0;

  do {
    const response = await getCmsPosts({
      type: type === 'all' ? undefined : type,
      status: status === 'all' ? undefined : status,
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

function getDeadlineValue(post: CmsPost) {
  const directLastDate = post.lastDate?.trim();
  if (directLastDate) return directLastDate;

  const importantLastDate = post.importantDates.find((item) => item.kind === 'last_date' && item.value.trim());
  return importantLastDate?.value.trim();
}

function hasInvalidDate(value: string) {
  return Number.isNaN(Date.parse(value));
}

function buildDuplicateSlugMap(posts: CmsPost[]) {
  return posts.reduce<Map<string, CmsPost[]>>((acc, post) => {
    const slug = post.slug?.trim().toLowerCase();
    if (!slug) return acc;
    const group = acc.get(slug) ?? [];
    group.push(post);
    acc.set(slug, group);
    return acc;
  }, new Map<string, CmsPost[]>());
}

function createIssues(posts: CmsPost[]): DataQualityIssue[] {
  const duplicateSlugs = buildDuplicateSlugMap(posts);

  return posts.flatMap((post) => {
    const issues: DataQualityIssue[] = [];
    const deadline = getDeadlineValue(post);
    const duplicateGroup = duplicateSlugs.get(post.slug.trim().toLowerCase());

    if (post.officialSources.length === 0) {
      issues.push({
        id: `${post.id}:missing-official-source`,
        kind: 'missing-official-source',
        label: 'Missing official source',
        detail: 'No official notification, notice, result, prospectus, or website source is stored.',
        post,
      });
    }

    if (APPLICATION_DEADLINE_TYPES.has(post.type) && !deadline) {
      issues.push({
        id: `${post.id}:missing-deadline`,
        kind: 'missing-deadline',
        label: 'Missing last date',
        detail: 'Application-driven posts need a last date before admins can trust deadline messaging.',
        post,
      });
    }

    if (deadline && hasInvalidDate(deadline)) {
      issues.push({
        id: `${post.id}:invalid-deadline`,
        kind: 'invalid-deadline',
        label: 'Invalid deadline',
        detail: `Stored deadline "${deadline}" cannot be parsed as a date.`,
        post,
      });
    }

    if (post.status === 'published' && post.freshness?.archiveState === 'expired') {
      issues.push({
        id: `${post.id}:expired-published`,
        kind: 'expired-published',
        label: 'Expired but still published',
        detail: post.freshness.staleReason || 'The freshness signal says this published post is expired.',
        post,
      });
    }

    if (!post.organization?.name?.trim()) {
      issues.push({
        id: `${post.id}:missing-organization`,
        kind: 'missing-organization',
        label: 'Missing organization',
        detail: 'The post is not attached to an organization taxonomy entry.',
        post,
      });
    }

    if (!post.type || post.categories.length === 0 || post.states.length === 0) {
      const missing = [
        !post.type ? 'type' : '',
        post.categories.length === 0 ? 'category' : '',
        post.states.length === 0 ? 'state' : '',
      ].filter(Boolean).join(', ');
      issues.push({
        id: `${post.id}:missing-taxonomy`,
        kind: 'missing-taxonomy',
        label: 'Missing category / state / type',
        detail: `Missing ${missing}.`,
        post,
      });
    }

    if (!post.seo?.metaTitle?.trim() || !post.seo?.metaDescription?.trim()) {
      const missing = [
        !post.seo?.metaTitle?.trim() ? 'meta title' : '',
        !post.seo?.metaDescription?.trim() ? 'meta description' : '',
      ].filter(Boolean).join(' and ');
      issues.push({
        id: `${post.id}:missing-seo`,
        kind: 'missing-seo',
        label: 'Missing SEO metadata',
        detail: `Missing persisted ${missing}. Runtime fallbacks are not counted as stored metadata.`,
        post,
      });
    }

    if (post.freshness?.isStale) {
      issues.push({
        id: `${post.id}:stale-content`,
        kind: 'stale-content',
        label: 'Stale content',
        detail: post.freshness.staleReason || 'Freshness signal marks this content as stale.',
        post,
      });
    }

    if (duplicateGroup && duplicateGroup.length > 1) {
      issues.push({
        id: `${post.id}:duplicate-slug`,
        kind: 'duplicate-slug',
        label: 'Duplicate slug',
        detail: `Slug "/${post.slug}" appears on ${duplicateGroup.length} fetched posts.`,
        post,
      });
    }

    if ((post.readiness?.issueCount ?? 0) > 0 || (post.readiness?.publishIssueCount ?? 0) > 0 || (post.readiness?.warningCount ?? 0) > 0) {
      const issueText = [
        ...(post.readiness?.issues ?? []),
        ...(post.readiness?.publishIssues ?? []),
        ...(post.readiness?.warnings ?? []),
      ].filter(Boolean);
      issues.push({
        id: `${post.id}:readiness`,
        kind: 'readiness',
        label: 'Content readiness issues',
        detail: issueText[0] || 'Readiness signals report issues or warnings for this post.',
        post,
      });
    }

    return issues;
  });
}

function countIssues(issues: DataQualityIssue[], kind: IssueKind) {
  return new Set(issues.filter((issue) => issue.kind === kind).map((issue) => issue.post.id)).size;
}

function formatStatus(status: EditorialStatus) {
  return status.replace('_', ' ');
}

function DataQualityMetricCard({ card, active, onClick }: { card: MetricCard; active: boolean; onClick: () => void }) {
  const Icon = card.icon;
  return (
    <button type="button" onClick={onClick} className="text-left">
      <Card className={active ? 'border-primary shadow-sm' : ''}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{card.label}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          {card.unavailable ? (
            <p className="text-sm font-semibold text-muted-foreground">{UNAVAILABLE}</p>
          ) : (
            <div className="text-2xl font-bold">{card.value?.toLocaleString('en-IN') ?? 0}</div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{card.description}</p>
        </CardContent>
      </Card>
    </button>
  );
}

export function DataQualityPage() {
  const [postType, setPostType] = useState<'all' | ContentType>('all');
  const [status, setStatus] = useState<'all' | EditorialStatus>('all');
  const [issueKind, setIssueKind] = useState<IssueFilter>('all');

  const inventoryQuery = useQuery({
    queryKey: ['data-quality-cms-inventory', postType, status],
    queryFn: () => loadCmsInventory(postType, status),
  });

  const posts = inventoryQuery.data?.posts ?? EMPTY_POSTS;
  const issues = useMemo(() => createIssues(posts), [posts]);
  const visibleIssues = useMemo(
    () => issueKind === 'all' ? issues : issues.filter((issue) => issue.kind === issueKind),
    [issueKind, issues],
  );

  const metricCards = useMemo<MetricCard[]>(() => [
    {
      key: 'missing-official-source',
      label: 'Missing official source',
      value: countIssues(issues, 'missing-official-source'),
      description: 'Posts without an official source entry.',
      icon: Link2Off,
    },
    {
      key: 'missing-deadline',
      label: 'Missing last date',
      value: countIssues(issues, 'missing-deadline'),
      description: 'Job and admission posts without a deadline.',
      icon: CalendarX2,
    },
    {
      key: 'expired-published',
      label: 'Expired but still published',
      value: countIssues(issues, 'expired-published'),
      description: 'Published posts marked expired by freshness signals.',
      icon: AlertTriangle,
    },
    {
      key: 'missing-organization',
      label: 'Missing organization',
      value: countIssues(issues, 'missing-organization'),
      description: 'Posts without an organization taxonomy.',
      icon: Landmark,
    },
    {
      key: 'missing-seo',
      label: 'Missing SEO metadata',
      value: countIssues(issues, 'missing-seo'),
      description: 'Posts missing persisted title or description metadata.',
      icon: SearchX,
    },
    {
      key: 'stale-content',
      label: 'Stale content',
      value: countIssues(issues, 'stale-content'),
      description: 'Posts marked stale by backend freshness signals.',
      icon: FileText,
    },
    {
      key: 'duplicate-slug',
      label: 'Duplicate slugs',
      value: countIssues(issues, 'duplicate-slug'),
      description: 'Duplicate slugs detected in fetched CMS inventory.',
      icon: Tags,
    },
  ], [issues]);

  const issueCounts = useMemo(() => ({
    invalidDeadline: countIssues(issues, 'invalid-deadline'),
    taxonomy: countIssues(issues, 'missing-taxonomy'),
    readiness: countIssues(issues, 'readiness'),
  }), [issues]);

  if (inventoryQuery.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Quality</h1>
          <p className="mt-1 text-muted-foreground">Find incomplete, stale, or risky government-job content and open the affected post for repair.</p>
        </div>
        <Button type="button" variant="outline" disabled={inventoryQuery.isFetching} onClick={() => void inventoryQuery.refetch()}>
          <RefreshCw className={`h-4 w-4 ${inventoryQuery.isFetching ? 'animate-spin' : ''}`} />
          Recheck
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>Counts and issues are derived from the current CMS post API response.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select value={postType} onValueChange={(value) => setPostType(value as 'all' | ContentType)}>
            <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {contentTypes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(value) => setStatus(value as 'all' | EditorialStatus)}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {statuses.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={issueKind} onValueChange={(value) => setIssueKind(value as IssueFilter)}>
            <SelectTrigger><SelectValue placeholder="Issue kind" /></SelectTrigger>
            <SelectContent>
              {issueOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {inventoryQuery.isError ? (
        <Card>
          <CardContent className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-7 w-7 text-destructive" />
            <p className="font-medium">{UNAVAILABLE}</p>
            <p className="text-sm text-muted-foreground">CMS post inventory could not be loaded, so no data-quality counts are shown.</p>
            <Button type="button" variant="outline" onClick={() => void inventoryQuery.refetch()}>
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metricCards.map((card) => (
              <DataQualityMetricCard
                key={card.key}
                card={card}
                active={issueKind === card.key}
                onClick={() => setIssueKind((current) => current === card.key ? 'all' : card.key)}
              />
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <DatabaseZap className="h-4 w-4" />
                Additional Checks
              </CardTitle>
              <CardDescription>These requested checks are available through the CMS inventory but are not separate summary cards.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{issueCounts.invalidDeadline} invalid deadline</Badge>
              <Badge variant="outline">{issueCounts.taxonomy} missing category / state / type</Badge>
              <Badge variant="outline">{issueCounts.readiness} content readiness</Badge>
              <span className="self-center">Scanned {posts.length.toLocaleString('en-IN')} of {(inventoryQuery.data?.total ?? 0).toLocaleString('en-IN')} matching posts.</span>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Affected Posts</CardTitle>
              <CardDescription>Each issue links directly to the CMS editor for the affected post.</CardDescription>
            </CardHeader>
            <CardContent>
              {visibleIssues.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center gap-2 text-center">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                  <p className="font-medium">No matching data-quality issues found</p>
                  <p className="text-sm text-muted-foreground">No current API data indicates this issue for the selected filters.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full min-w-[820px] text-sm">
                    <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3">Post</th>
                        <th className="px-4 py-3">Issue</th>
                        <th className="px-4 py-3">Type / Status</th>
                        <th className="px-4 py-3">Signals</th>
                        <th className="px-4 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleIssues.map((issue) => (
                        <tr key={issue.id} className="border-t border-border align-top">
                          <td className="max-w-80 px-4 py-3">
                            <p className="font-semibold">{issue.post.title}</p>
                            <p className="mt-1 truncate text-xs text-muted-foreground">/{issue.post.slug}</p>
                          </td>
                          <td className="max-w-96 px-4 py-3">
                            <Badge variant="outline" className="mb-1">{issue.label}</Badge>
                            <p className="text-xs leading-5 text-muted-foreground">{issue.detail}</p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="capitalize">{issue.post.type.replace('-', ' ')}</p>
                            <p className="mt-1 text-xs capitalize text-muted-foreground">{formatStatus(issue.post.status)}</p>
                          </td>
                          <td className="px-4 py-3 text-xs leading-5 text-muted-foreground">
                            <p>Sources: {issue.post.officialSources.length}</p>
                            <p>Readiness: {issue.post.readiness?.issueCount ?? 0} issue(s), {issue.post.readiness?.warningCount ?? 0} warning(s)</p>
                            <p>Freshness: {issue.post.freshness?.archiveState ?? 'unknown'}</p>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button asChild type="button" size="sm" variant="outline">
                              <Link href={`/announcements/${issue.post.id}`}>
                                <FilePenLine className="h-4 w-4" />
                                Open / edit
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
