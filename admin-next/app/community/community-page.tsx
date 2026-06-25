'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  CircleCheck,
  Flag,
  Loader2,
  MessageCircle,
  RefreshCw,
  Reply,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  answerCommunityQA,
  getCommentsPending,
  getCommunityFlags,
  getCommunityQA,
  moderateComment,
  updateCommunityFlag,
  type CommunityFlagItem,
  type CommunityQAItem,
  type PendingCommunityComment,
} from '@/lib/api';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

const PAGE_SIZE = 50;

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function LoadingState() {
  return (
    <div className="flex min-h-52 items-center justify-center">
      <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return <div className="py-14 text-center text-sm text-muted-foreground">{message}</div>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  return (
    <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center">
      <AlertTriangle className="h-7 w-7 text-destructive" />
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button type="button" variant="outline" onClick={retry}>
        <RefreshCw className="h-4 w-4" />
        Retry
      </Button>
    </div>
  );
}

function CommentCard({
  comment,
  busy,
  onModerate,
}: {
  comment: PendingCommunityComment;
  busy: boolean;
  onModerate: (comment: PendingCommunityComment, action: 'approve' | 'reject') => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold">{comment.username || 'Anonymous'}</p>
          <p className="text-xs text-muted-foreground">{formatDate(comment.createdAt)}</p>
        </div>
        <Badge variant="secondary">Pending</Badge>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">{comment.body}</p>
      {comment.postId ? <p className="text-xs text-muted-foreground">Post ID: {comment.postId}</p> : null}
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onModerate(comment, 'approve')}>
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          Approve
        </Button>
        <Button type="button" size="sm" variant="destructive" disabled={busy} onClick={() => onModerate(comment, 'reject')}>
          <XCircle className="h-4 w-4" />
          Reject
        </Button>
      </div>
    </div>
  );
}

function FlagCard({
  item,
  busy,
  resolved = false,
  onUpdate,
}: {
  item: CommunityFlagItem;
  busy: boolean;
  resolved?: boolean;
  onUpdate: (id: string, status: 'reviewed' | 'resolved') => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold capitalize">{item.entityType} report</p>
          <p className="text-xs text-muted-foreground">Entity: {item.entityId} · {formatDate(item.createdAt)}</p>
        </div>
        <Badge variant={item.status === 'resolved' ? 'default' : 'secondary'}>{item.status}</Badge>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">{item.reason}</p>
      <p className="text-xs text-muted-foreground">Reporter: {item.reporter || 'Anonymous'}</p>
      {!resolved ? (
        <div className="flex flex-wrap gap-2">
          {item.status === 'open' ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => onUpdate(item.id, 'reviewed')}>
              <ShieldCheck className="h-4 w-4" />
              Mark reviewed
            </Button>
          ) : null}
          <Button type="button" size="sm" disabled={busy} onClick={() => onUpdate(item.id, 'resolved')}>
            <CircleCheck className="h-4 w-4" />
            Resolve
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function CommunityPage() {
  const queryClient = useQueryClient();
  const [answerTarget, setAnswerTarget] = useState<CommunityQAItem | null>(null);
  const [answer, setAnswer] = useState('');
  const [rejectTarget, setRejectTarget] = useState<PendingCommunityComment | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const commentsQuery = useQuery({
    queryKey: ['community-moderation', 'comments'],
    queryFn: () => getCommentsPending(PAGE_SIZE),
  });
  const qaQuery = useQuery({
    queryKey: ['community-moderation', 'qa'],
    queryFn: () => getCommunityQA({ limit: PAGE_SIZE }),
  });
  const openFlagsQuery = useQuery({
    queryKey: ['community-moderation', 'flags', 'open'],
    queryFn: () => getCommunityFlags({ status: 'open', limit: PAGE_SIZE }),
  });
  const reviewedFlagsQuery = useQuery({
    queryKey: ['community-moderation', 'flags', 'reviewed'],
    queryFn: () => getCommunityFlags({ status: 'reviewed', limit: PAGE_SIZE }),
  });
  const resolvedFlagsQuery = useQuery({
    queryKey: ['community-moderation', 'flags', 'resolved'],
    queryFn: () => getCommunityFlags({ status: 'resolved', limit: PAGE_SIZE }),
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, action, auditReason }: { id: string; action: 'approve' | 'reject'; auditReason?: string }) => moderateComment(id, action, auditReason),
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['community-moderation', 'comments'] });
      setRejectTarget(null);
      setRejectReason('');
      toast.success(variables.action === 'approve' ? 'Comment approved.' : 'Comment rejected.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const answerMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: string }) => answerCommunityQA(id, response),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['community-moderation', 'qa'] });
      setAnswerTarget(null);
      setAnswer('');
      toast.success('Answer saved.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const flagMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'reviewed' | 'resolved' }) => updateCommunityFlag(id, status),
    onSuccess: (_response, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['community-moderation', 'flags'] });
      toast.success(variables.status === 'resolved' ? 'Report resolved.' : 'Report marked reviewed.');
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const comments = commentsQuery.data?.data ?? [];
  const questions = qaQuery.data?.data ?? [];
  const activeFlags = [...(openFlagsQuery.data?.data ?? []), ...(reviewedFlagsQuery.data?.data ?? [])];
  const resolvedFlags = resolvedFlagsQuery.data?.data ?? [];
  const activeFlagsLoading = openFlagsQuery.isLoading || reviewedFlagsQuery.isLoading;
  const activeFlagsError = openFlagsQuery.isError || reviewedFlagsQuery.isError;

  function requestModeration(comment: PendingCommunityComment, action: 'approve' | 'reject') {
    if (action === 'reject') {
      setRejectTarget(comment);
      setRejectReason('');
      return;
    }
    moderateMutation.mutate({ id: comment.id, action });
  }

  function openAnswerDialog(question: CommunityQAItem) {
    setAnswerTarget(question);
    setAnswer(question.answer ?? '');
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Community Moderation</h1>
          <p className="mt-1 text-sm text-muted-foreground">Review comments, answer community questions, and process user reports.</p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-4 w-4" />
          Live API-backed queue
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Pending comments</p><p className="text-2xl font-bold">{comments.length}</p></div><MessageCircle className="h-5 w-5 text-blue-600" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Unanswered Q&amp;A</p><p className="text-2xl font-bold">{questions.filter((item) => !item.answer).length}</p></div><Reply className="h-5 w-5 text-amber-600" /></CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-4"><div><p className="text-xs text-muted-foreground">Active reports</p><p className="text-2xl font-bold">{activeFlags.length}</p></div><Flag className="h-5 w-5 text-red-600" /></CardContent></Card>
      </div>

      <Tabs defaultValue="comments" className="space-y-4">
        <TabsList className="h-auto max-w-full flex-wrap justify-start">
          <TabsTrigger value="comments">Pending Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="qa">Q&amp;A ({questions.length})</TabsTrigger>
          <TabsTrigger value="flags">Flags / Reports ({activeFlags.length})</TabsTrigger>
          <TabsTrigger value="resolved">Resolved ({resolvedFlags.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="comments">
          <Card>
            <CardHeader><CardTitle className="text-base">Pending Comments</CardTitle><CardDescription>Approve relevant comments or reject content that violates moderation policy.</CardDescription></CardHeader>
            <CardContent>
              {commentsQuery.isLoading ? <LoadingState /> : commentsQuery.isError ? (
                <ErrorState message="Pending comments could not be loaded." retry={() => void commentsQuery.refetch()} />
              ) : comments.length === 0 ? <EmptyState message="No comments are waiting for moderation." /> : (
                <div className="space-y-3">{comments.map((comment) => <CommentCard key={comment.id} comment={comment} busy={moderateMutation.isPending} onModerate={requestModeration} />)}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="qa">
          <Card>
            <CardHeader><CardTitle className="text-base">Community Q&amp;A</CardTitle><CardDescription>Answers are saved directly to the PostgreSQL-backed Q&amp;A record.</CardDescription></CardHeader>
            <CardContent>
              {qaQuery.isLoading ? <LoadingState /> : qaQuery.isError ? (
                <ErrorState message="Community questions could not be loaded." retry={() => void qaQuery.refetch()} />
              ) : questions.length === 0 ? <EmptyState message="No community questions found." /> : (
                <div className="space-y-3">
                  {questions.map((item) => (
                    <div key={item.id} className="space-y-3 rounded-lg border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div><p className="text-sm font-semibold">{item.author}</p><p className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</p></div>
                        <Badge variant={item.answer ? 'default' : 'secondary'}>{item.answer ? 'Answered' : 'Unanswered'}</Badge>
                      </div>
                      <p className="whitespace-pre-wrap text-sm leading-6">{item.question}</p>
                      {item.answer ? <div className="rounded-lg bg-muted p-3"><p className="text-xs font-semibold text-muted-foreground">Answer by {item.answeredBy || 'admin'}</p><p className="mt-1 whitespace-pre-wrap text-sm">{item.answer}</p></div> : null}
                      <Button type="button" size="sm" variant="outline" onClick={() => openAnswerDialog(item)}>
                        <Reply className="h-4 w-4" />
                        {item.answer ? 'Edit answer' : 'Answer'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="flags">
          <Card>
            <CardHeader><CardTitle className="text-base">Flags / Reports</CardTitle><CardDescription>Review open reports and move completed investigations to resolved.</CardDescription></CardHeader>
            <CardContent>
              {activeFlagsLoading ? <LoadingState /> : activeFlagsError ? (
                <ErrorState message="Active reports could not be loaded." retry={() => { void openFlagsQuery.refetch(); void reviewedFlagsQuery.refetch(); }} />
              ) : activeFlags.length === 0 ? <EmptyState message="No active community reports." /> : (
                <div className="space-y-3">{activeFlags.map((item) => <FlagCard key={item.id} item={item} busy={flagMutation.isPending} onUpdate={(id, status) => flagMutation.mutate({ id, status })} />)}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resolved">
          <Card>
            <CardHeader><CardTitle className="text-base">Resolved Reports</CardTitle><CardDescription>Read-only history of reports marked resolved through the backend.</CardDescription></CardHeader>
            <CardContent>
              {resolvedFlagsQuery.isLoading ? <LoadingState /> : resolvedFlagsQuery.isError ? (
                <ErrorState message="Resolved reports could not be loaded." retry={() => void resolvedFlagsQuery.refetch()} />
              ) : resolvedFlags.length === 0 ? <EmptyState message="No resolved community reports." /> : (
                <div className="space-y-3">{resolvedFlags.map((item) => <FlagCard key={item.id} item={item} busy={false} resolved onUpdate={() => undefined} />)}</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={Boolean(answerTarget)} onOpenChange={(open) => { if (!open && !answerMutation.isPending) setAnswerTarget(null); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{answerTarget?.answer ? 'Edit answer' : 'Answer question'}</DialogTitle><DialogDescription>{answerTarget?.question}</DialogDescription></DialogHeader>
          <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={7} maxLength={2000} placeholder="Write an accurate response…" />
          <div className="text-right text-xs text-muted-foreground">{answer.length}/2000</div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={answerMutation.isPending} onClick={() => setAnswerTarget(null)}>Cancel</Button>
            <Button type="button" disabled={answerMutation.isPending || !answer.trim() || !answerTarget} onClick={() => { if (answerTarget) answerMutation.mutate({ id: answerTarget.id, response: answer.trim() }); }}>
              {answerMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Reply className="h-4 w-4" />}
              Save answer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(rejectTarget)} onOpenChange={(open) => { if (!open && !moderateMutation.isPending) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reject comment?</DialogTitle><DialogDescription>The backend will mark this comment rejected and record the moderation reason in the audit log.</DialogDescription></DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="comment-reject-reason" className="text-sm font-semibold">Audit reason</label>
            <Textarea
              id="comment-reject-reason"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Policy violation, spam, duplicate, or other moderation reason"
              aria-invalid={rejectReason.trim().length > 0 && rejectReason.trim().length < 3}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Required before rejection.</span>
              <span>{rejectReason.length}/500</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={moderateMutation.isPending} onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Cancel</Button>
            <Button type="button" variant="destructive" disabled={moderateMutation.isPending || !rejectTarget || rejectReason.trim().length < 3} onClick={() => { if (rejectTarget) moderateMutation.mutate({ id: rejectTarget.id, action: 'reject', auditReason: rejectReason.trim() }); }}>
              {moderateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
              Confirm reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
