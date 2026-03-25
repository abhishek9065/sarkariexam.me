'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getCampaigns, createCampaign, sendCampaign, getSegments } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Send, Users, Clock, Target, Loader2, Megaphone, CheckCircle, AlertCircle } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  scheduled: 'bg-blue-500',
  sending: 'bg-yellow-500',
  sent: 'bg-green-500',
  failed: 'bg-red-500',
};

export function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('');
  const [segmentType, setSegmentType] = useState('all');
  const [segmentValue, setSegmentValue] = useState('all');

  const { data: campaigns, isLoading: loadingCampaigns, refetch } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: async () => {
      const res = await getCampaigns();
      return res.data;
    },
  });

  const { data: segmentsData, isLoading: loadingSegments } = useQuery({
    queryKey: ['admin-segments'],
    queryFn: async () => {
      const res = await getSegments();
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: createCampaign,
    onSuccess: () => {
      toast.success('Campaign created successfully');
      setTitle('');
      setBody('');
      setUrl('');
      refetch();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create campaign'),
  });

  const sendMutation = useMutation({
    mutationFn: sendCampaign,
    onSuccess: () => {
      toast.success('Campaign sent successfully');
      refetch();
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send campaign'),
  });

  const segments = segmentsData?.segments;
  const segmentCounts = segmentsData?.counts || [];

  const getTargetCount = () => {
    if (segmentType === 'all') return segments?.totalUsers || 0;
    const match = segmentCounts.find(c => c.type === segmentType && c.value === segmentValue);
    return match?.count || 0;
  };

  const handleCreate = (sendImmediately = false) => {
    if (!title || !body) {
      toast.error('Title and body are required');
      return;
    }

    createMutation.mutate({
      title,
      body,
      url: url || undefined,
      segment: { type: segmentType, value: segmentValue },
    }, {
      onSuccess: (res) => {
        if (sendImmediately && res.data.id) {
          sendMutation.mutate(res.data.id);
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Notification Campaigns</h1>
        <p className="text-muted-foreground mt-1">Send targeted notifications to user segments</p>
      </div>

      <Tabs defaultValue="compose" className="space-y-6">
        <TabsList>
          <TabsTrigger value="compose" className="flex items-center gap-1.5">
            <Megaphone className="h-4 w-4" />
            Compose
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1.5">
            <Clock className="h-4 w-4" />
            History
          </TabsTrigger>
        </TabsList>

        {/* Compose Tab */}
        <TabsContent value="compose" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Composer */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Create Campaign</CardTitle>
                <CardDescription>Craft your notification message</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Notification Title</label>
                  <Input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. New Railway Jobs Alert"
                    maxLength={100}
                  />
                  <p className="text-xs text-muted-foreground">{title.length}/100 characters</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Message Body</label>
                  <Textarea
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    placeholder="Write your notification message..."
                    rows={4}
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground">{body.length}/500 characters</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Link URL (optional)</label>
                  <Input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="https://sarkariexams.me/..."
                    type="url"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Target Segment</label>
                    <Select value={segmentType} onValueChange={setSegmentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Users</SelectItem>
                        <SelectItem value="state">By State</SelectItem>
                        <SelectItem value="category">By Category</SelectItem>
                        <SelectItem value="language">By Language</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Segment Value</label>
                    {segmentType === 'all' ? (
                      <Input disabled value="All Users" />
                    ) : segmentType === 'state' ? (
                      <Select value={segmentValue} onValueChange={setSegmentValue}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {loadingSegments ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : (
                            segments?.states.map(state => (
                              <SelectItem key={state} value={state}>{state}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : segmentType === 'category' ? (
                      <Select value={segmentValue} onValueChange={setSegmentValue}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {loadingSegments ? (
                            <SelectItem value="loading">Loading...</SelectItem>
                          ) : (
                            segments?.categories.map(cat => (
                              <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Select value={segmentValue} onValueChange={setSegmentValue}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {segments?.languages.map(lang => (
                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Target className="h-4 w-4" />
                    Target: <strong>{getTargetCount().toLocaleString()}</strong> users
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => handleCreate(false)}
                    disabled={createMutation.isPending || !title || !body}
                    variant="outline"
                  >
                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Save as Draft
                  </Button>
                  <Button
                    onClick={() => handleCreate(true)}
                    disabled={createMutation.isPending || sendMutation.isPending || !title || !body}
                  >
                    {createMutation.isPending || sendMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold">
                      SE
                    </div>
                    <div>
                      <p className="text-sm font-medium">SarkariExams.me</p>
                      <p className="text-xs text-muted-foreground">Just now</p>
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold">{title || 'Notification Title'}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {body || 'Your notification message will appear here...'}
                    </p>
                  </div>
                  {url && (
                    <div className="text-xs text-blue-600 truncate">{url}</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Past Campaigns</CardTitle>
              <CardDescription>History of sent notification campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingCampaigns ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : campaigns?.length === 0 ? (
                <p className="text-center text-muted-foreground py-12">No campaigns yet</p>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(campaign => (
                    <div
                      key={campaign.id}
                      className="flex items-center justify-between p-4 rounded-lg border bg-muted/30"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium truncate">{campaign.title}</p>
                          <Badge className={`${STATUS_COLORS[campaign.status]} text-white`}>
                            {campaign.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-1">{campaign.body}</p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            {campaign.sentCount.toLocaleString()} recipients
                          </span>
                          <span className="flex items-center gap-1">
                            <Target className="h-3 w-3" />
                            {campaign.segment.type}: {campaign.segment.value}
                          </span>
                          <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      {campaign.status === 'draft' && (
                        <Button
                          size="sm"
                          onClick={() => sendMutation.mutate(campaign.id)}
                          disabled={sendMutation.isPending}
                        >
                          {sendMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      {campaign.status === 'sent' && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {campaign.status === 'failed' && (
                        <AlertCircle className="h-5 w-5 text-red-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
