'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getCommunityForums, deleteCommunityForum,
  getCommunityQA, deleteCommunityQA, answerCommunityQA,
  getCommunityGroups, deleteCommunityGroup,
  getCommunityFlags, updateCommunityFlag,
} from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  MessageSquare, HelpCircle, Users, Flag, Trash2, Loader2,
  ChevronLeft, ChevronRight, CheckCircle, Eye, Send,
} from 'lucide-react';

const PAGE_SIZE = 20;

function Pagination({ page, totalPages, total, pageSize, onPrev, onNext }: {
  page: number; totalPages: number; total: number; pageSize: number; onPrev: () => void; onNext: () => void;
}) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4">
      <p className="text-sm text-muted-foreground">{page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}</p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page === 0} onClick={onPrev}><ChevronLeft className="h-4 w-4" /></Button>
        <span className="text-sm text-muted-foreground">{page + 1}/{totalPages}</span>
        <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={onNext}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export function CommunityPage() {
  const qc = useQueryClient();

  // Forums
  const [forumPage, setForumPage] = useState(0);
  const [deleteForumId, setDeleteForumId] = useState<string | null>(null);
  const { data: forumData, isLoading: forumLoading } = useQuery({
    queryKey: ['admin-community-forums', forumPage],
    queryFn: () => getCommunityForums({ limit: PAGE_SIZE, offset: forumPage * PAGE_SIZE }),
  });
  const deleteForumMut = useMutation({
    mutationFn: deleteCommunityForum,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-community-forums'] }); toast.success('Forum post deleted'); setDeleteForumId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  // QA
  const [qaPage, setQaPage] = useState(0);
  const [deleteQaId, setDeleteQaId] = useState<string | null>(null);
  const [answerQaId, setAnswerQaId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const { data: qaData, isLoading: qaLoading } = useQuery({
    queryKey: ['admin-community-qa', qaPage],
    queryFn: () => getCommunityQA({ limit: PAGE_SIZE, offset: qaPage * PAGE_SIZE }),
  });
  const deleteQaMut = useMutation({
    mutationFn: deleteCommunityQA,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-community-qa'] }); toast.success('Question deleted'); setDeleteQaId(null); },
    onError: (e: Error) => toast.error(e.message),
  });
  const answerMut = useMutation({
    mutationFn: ({ id, answer }: { id: string; answer: string }) => answerCommunityQA(id, answer),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-community-qa'] }); toast.success('Answer saved'); setAnswerQaId(null); setAnswerText(''); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Groups
  const [groupPage, setGroupPage] = useState(0);
  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const { data: groupData, isLoading: groupLoading } = useQuery({
    queryKey: ['admin-community-groups', groupPage],
    queryFn: () => getCommunityGroups({ limit: PAGE_SIZE, offset: groupPage * PAGE_SIZE }),
  });
  const deleteGroupMut = useMutation({
    mutationFn: deleteCommunityGroup,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-community-groups'] }); toast.success('Group deleted'); setDeleteGroupId(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  // Flags
  const [flagPage, setFlagPage] = useState(0);
  const [flagStatus, setFlagStatus] = useState<string>('all');
  const { data: flagData, isLoading: flagLoading } = useQuery({
    queryKey: ['admin-community-flags', flagPage, flagStatus],
    queryFn: () => getCommunityFlags({ status: flagStatus !== 'all' ? flagStatus : undefined, limit: PAGE_SIZE, offset: flagPage * PAGE_SIZE }),
  });
  const flagMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'reviewed' | 'resolved' }) => updateCommunityFlag(id, status),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['admin-community-flags'] }); toast.success('Flag updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const forums = forumData?.data || [];
  const forumTotal = forumData?.total || 0;
  const qa = qaData?.data || [];
  const qaTotal = qaData?.total || 0;
  const groups = groupData?.data || [];
  const groupTotal = groupData?.total || 0;
  const flags = flagData?.data || [];
  const flagTotal = flagData?.total || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Community</h1>
        <p className="text-muted-foreground mt-1">Moderate forums, Q&A, study groups, and flagged content</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-500/10"><MessageSquare className="h-5 w-5 text-blue-600" /></div>
          <div><p className="text-2xl font-bold">{forumTotal}</p><p className="text-xs text-muted-foreground">Forum Posts</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-purple-500/10"><HelpCircle className="h-5 w-5 text-purple-600" /></div>
          <div><p className="text-2xl font-bold">{qaTotal}</p><p className="text-xs text-muted-foreground">Questions</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-green-500/10"><Users className="h-5 w-5 text-green-600" /></div>
          <div><p className="text-2xl font-bold">{groupTotal}</p><p className="text-xs text-muted-foreground">Study Groups</p></div>
        </CardContent></Card>
        <Card><CardContent className="pt-6 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-500/10"><Flag className="h-5 w-5 text-red-600" /></div>
          <div><p className="text-2xl font-bold">{flagTotal}</p><p className="text-xs text-muted-foreground">Flags</p></div>
        </CardContent></Card>
      </div>

      <Tabs defaultValue="forums">
        <TabsList>
          <TabsTrigger value="forums"><MessageSquare className="h-4 w-4 mr-1.5" />Forums</TabsTrigger>
          <TabsTrigger value="qa"><HelpCircle className="h-4 w-4 mr-1.5" />Q&A</TabsTrigger>
          <TabsTrigger value="groups"><Users className="h-4 w-4 mr-1.5" />Groups</TabsTrigger>
          <TabsTrigger value="flags"><Flag className="h-4 w-4 mr-1.5" />Flags</TabsTrigger>
        </TabsList>

        {/* Forums */}
        <TabsContent value="forums" className="mt-4 space-y-4">
          {forumLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : forums.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No forum posts yet.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Title</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Category</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Author</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {forums.map((f: any) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3"><p className="font-medium line-clamp-1">{f.title}</p><p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{f.content?.slice(0, 80)}</p></td>
                      <td className="px-4 py-3 hidden sm:table-cell"><Badge variant="outline">{f.category}</Badge></td>
                      <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{f.author}</td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteForumId(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></CardContent></Card>
          )}
          <Pagination page={forumPage} totalPages={Math.ceil(forumTotal / PAGE_SIZE)} total={forumTotal} pageSize={PAGE_SIZE} onPrev={() => setForumPage(p => p - 1)} onNext={() => setForumPage(p => p + 1)} />
        </TabsContent>

        {/* Q&A */}
        <TabsContent value="qa" className="mt-4 space-y-4">
          {qaLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : qa.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No questions yet.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Question</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Author</th>
                  <th className="text-left px-4 py-3 font-medium">Answered</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {qa.map((q: any) => (
                    <tr key={q.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3"><p className="font-medium line-clamp-2">{q.question}</p></td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{q.author}</td>
                      <td className="px-4 py-3">
                        {q.answer ? <Badge variant="default" className="bg-green-600">Yes</Badge> : <Badge variant="secondary">No</Badge>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{q.createdAt ? new Date(q.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" title="Answer" onClick={() => { setAnswerQaId(q.id); setAnswerText(q.answer || ''); }}>
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteQaId(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></CardContent></Card>
          )}
          <Pagination page={qaPage} totalPages={Math.ceil(qaTotal / PAGE_SIZE)} total={qaTotal} pageSize={PAGE_SIZE} onPrev={() => setQaPage(p => p - 1)} onNext={() => setQaPage(p => p + 1)} />
        </TabsContent>

        {/* Groups */}
        <TabsContent value="groups" className="mt-4 space-y-4">
          {groupLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : groups.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No study groups yet.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Topic</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Language</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Link</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {groups.map((g: any) => (
                    <tr key={g.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{g.name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{g.topic}</td>
                      <td className="px-4 py-3 hidden md:table-cell"><Badge variant="outline">{g.language}</Badge></td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {g.link ? <a href={g.link} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs truncate block max-w-[200px]">{g.link}</a> : '—'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => setDeleteGroupId(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></CardContent></Card>
          )}
          <Pagination page={groupPage} totalPages={Math.ceil(groupTotal / PAGE_SIZE)} total={groupTotal} pageSize={PAGE_SIZE} onPrev={() => setGroupPage(p => p - 1)} onNext={() => setGroupPage(p => p + 1)} />
        </TabsContent>

        {/* Flags */}
        <TabsContent value="flags" className="mt-4 space-y-4">
          <Select value={flagStatus} onValueChange={v => { setFlagStatus(v); setFlagPage(0); }}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Flags</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="reviewed">Reviewed</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>

          {flagLoading ? <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div> : flags.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No flags found.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Reason</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Reporter</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr></thead>
                <tbody>
                  {flags.map((f: any) => (
                    <tr key={f.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3"><Badge variant="outline">{f.entityType}</Badge></td>
                      <td className="px-4 py-3 max-w-[250px] truncate">{f.reason}</td>
                      <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{f.reporter || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant={f.status === 'resolved' ? 'default' : f.status === 'reviewed' ? 'secondary' : 'destructive'} className={f.status === 'resolved' ? 'bg-green-600' : ''}>
                          {f.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">{f.createdAt ? new Date(f.createdAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {f.status === 'open' && (
                            <Button variant="ghost" size="icon" title="Mark Reviewed" onClick={() => flagMut.mutate({ id: f.id, status: 'reviewed' })}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          )}
                          {f.status !== 'resolved' && (
                            <Button variant="ghost" size="icon" title="Resolve" onClick={() => flagMut.mutate({ id: f.id, status: 'resolved' })}>
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div></CardContent></Card>
          )}
          <Pagination page={flagPage} totalPages={Math.ceil(flagTotal / PAGE_SIZE)} total={flagTotal} pageSize={PAGE_SIZE} onPrev={() => setFlagPage(p => p - 1)} onNext={() => setFlagPage(p => p + 1)} />
        </TabsContent>
      </Tabs>

      {/* Answer Dialog */}
      <Dialog open={!!answerQaId} onOpenChange={open => { if (!open) { setAnswerQaId(null); setAnswerText(''); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Answer Question</DialogTitle></DialogHeader>
          <Textarea value={answerText} onChange={e => setAnswerText(e.target.value)} placeholder="Write your answer..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAnswerQaId(null); setAnswerText(''); }}>Cancel</Button>
            <Button onClick={() => answerQaId && answerMut.mutate({ id: answerQaId, answer: answerText })} disabled={!answerText.trim() || answerMut.isPending}>
              {answerMut.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}Save Answer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialogs */}
      <AlertDialog open={!!deleteForumId} onOpenChange={o => { if (!o) setDeleteForumId(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Forum Post</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteForumId && deleteForumMut.mutate(deleteForumId)}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteQaId} onOpenChange={o => { if (!o) setDeleteQaId(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Question</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteQaId && deleteQaMut.mutate(deleteQaId)}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={!!deleteGroupId} onOpenChange={o => { if (!o) setDeleteGroupId(null); }}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete Study Group</AlertDialogTitle><AlertDialogDescription>This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteGroupId && deleteGroupMut.mutate(deleteGroupId)}>Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
