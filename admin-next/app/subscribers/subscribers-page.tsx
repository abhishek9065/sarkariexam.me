'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSubscribers, getSubscriberStats, deleteSubscriber, getPushSubscribers, sendPushNotification } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Mail, Bell, Search, Trash2, Loader2, ChevronLeft, ChevronRight,
  Send, Users, CheckCircle, XCircle,
} from 'lucide-react';

const PAGE_SIZE = 20;

export function SubscribersPage() {
  const queryClient = useQueryClient();

  // Email subscribers state
  const [emailSearch, setEmailSearch] = useState('');
  const [emailPage, setEmailPage] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Push state
  const [pushPage, setPushPage] = useState(0);
  const [pushForm, setPushForm] = useState({ title: '', body: '', url: '' });

  // Email queries
  const { data: emailData, isLoading: emailLoading } = useQuery({
    queryKey: ['admin-subscribers', emailSearch, emailPage],
    queryFn: () => getSubscribers({ search: emailSearch || undefined, limit: PAGE_SIZE, offset: emailPage * PAGE_SIZE }),
  });

  const { data: statsData } = useQuery({
    queryKey: ['admin-subscriber-stats'],
    queryFn: getSubscriberStats,
  });

  // Push queries
  const { data: pushData, isLoading: pushLoading } = useQuery({
    queryKey: ['admin-push-subscribers', pushPage],
    queryFn: () => getPushSubscribers({ limit: PAGE_SIZE, offset: pushPage * PAGE_SIZE }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSubscriber,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscribers'] });
      queryClient.invalidateQueries({ queryKey: ['admin-subscriber-stats'] });
      toast.success('Subscriber removed');
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sendMutation = useMutation({
    mutationFn: sendPushNotification,
    onSuccess: (result) => {
      const d = result.data;
      if (d.message) {
        toast.warning(d.message);
      } else {
        toast.success(`Sent to ${d.sent} subscribers (${d.failed} failed)`);
      }
      setPushForm({ title: '', body: '', url: '' });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const stats = statsData?.data;
  const emails = emailData?.data || [];
  const emailTotal = emailData?.total || 0;
  const emailPages = Math.ceil(emailTotal / PAGE_SIZE);

  const pushSubs = pushData?.data || [];
  const pushTotal = pushData?.total || 0;
  const pushPages = Math.ceil(pushTotal / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Subscribers</h1>
        <p className="text-muted-foreground mt-1">Manage email and push notification subscribers</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10"><Mail className="h-5 w-5 text-primary" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Email Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10"><CheckCircle className="h-5 w-5 text-green-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.verified}</p>
                  <p className="text-xs text-muted-foreground">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10"><XCircle className="h-5 w-5 text-orange-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{stats.unverified}</p>
                  <p className="text-xs text-muted-foreground">Unverified</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10"><Bell className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-2xl font-bold">{pushTotal}</p>
                  <p className="text-xs text-muted-foreground">Push Subscribers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="email">
        <TabsList>
          <TabsTrigger value="email"><Mail className="h-4 w-4 mr-1.5" />Email</TabsTrigger>
          <TabsTrigger value="push"><Bell className="h-4 w-4 mr-1.5" />Push</TabsTrigger>
          <TabsTrigger value="send"><Send className="h-4 w-4 mr-1.5" />Send Push</TabsTrigger>
        </TabsList>

        {/* Email Subscribers Tab */}
        <TabsContent value="email" className="space-y-4 mt-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email..."
              value={emailSearch}
              onChange={e => { setEmailSearch(e.target.value); setEmailPage(0); }}
              className="pl-9"
            />
          </div>

          {emailLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : emails.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No subscribers found.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium">Email</th>
                        <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Frequency</th>
                        <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Categories</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
                        <th className="text-right px-4 py-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {emails.map((sub: any) => (
                        <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{sub.email}</td>
                          <td className="px-4 py-3 hidden sm:table-cell">
                            <Badge variant="outline">{sub.frequency || 'daily'}</Badge>
                          </td>
                          <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                            {sub.categories?.join(', ') || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {sub.verified ? (
                              <Badge variant="default" className="bg-green-600">Verified</Badge>
                            ) : (
                              <Badge variant="secondary">Unverified</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(sub.id)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {emailPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {emailPage * PAGE_SIZE + 1}-{Math.min((emailPage + 1) * PAGE_SIZE, emailTotal)} of {emailTotal}
              </p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={emailPage === 0} onClick={() => setEmailPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{emailPage + 1}/{emailPages}</span>
                <Button variant="outline" size="sm" disabled={emailPage >= emailPages - 1} onClick={() => setEmailPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Push Subscribers Tab */}
        <TabsContent value="push" className="space-y-4 mt-4">
          {pushLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
          ) : pushSubs.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No push subscribers found.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="text-left px-4 py-3 font-medium">Endpoint</th>
                        <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">User</th>
                        <th className="text-left px-4 py-3 font-medium">Subscribed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pushSubs.map((sub: any) => (
                        <tr key={sub.id} className="border-b last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-mono text-xs truncate max-w-[400px]">{sub.endpoint}</td>
                          <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">{sub.userId || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground text-xs">
                            {sub.createdAt ? new Date(sub.createdAt).toLocaleDateString() : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {pushPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{pushPage * PAGE_SIZE + 1}-{Math.min((pushPage + 1) * PAGE_SIZE, pushTotal)} of {pushTotal}</p>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" disabled={pushPage === 0} onClick={() => setPushPage(p => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">{pushPage + 1}/{pushPages}</span>
                <Button variant="outline" size="sm" disabled={pushPage >= pushPages - 1} onClick={() => setPushPage(p => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Send Push Notification Tab */}
        <TabsContent value="send" className="mt-4">
          <Card className="max-w-xl">
            <CardHeader>
              <CardTitle className="text-base">Send Push Notification</CardTitle>
              <CardDescription>Send a notification to all {pushTotal} push subscribers</CardDescription>
            </CardHeader>
            <CardContent>
              <form
                className="space-y-4"
                onSubmit={e => {
                  e.preventDefault();
                  if (!pushForm.title || !pushForm.body) { toast.error('Title and body are required'); return; }
                  sendMutation.mutate({ title: pushForm.title, body: pushForm.body, url: pushForm.url || undefined });
                }}
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Title *</label>
                  <Input value={pushForm.title} onChange={e => setPushForm(p => ({ ...p, title: e.target.value }))} placeholder="Notification title" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Body *</label>
                  <Textarea value={pushForm.body} onChange={e => setPushForm(p => ({ ...p, body: e.target.value }))} placeholder="Notification body text" rows={3} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">URL (optional)</label>
                  <Input value={pushForm.url} onChange={e => setPushForm(p => ({ ...p, url: e.target.value }))} placeholder="https://sarkariexams.me/..." type="url" />
                </div>
                <Button type="submit" disabled={sendMutation.isPending}>
                  {sendMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                  Send to {pushTotal} subscribers
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Subscriber</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove this subscriber. This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
