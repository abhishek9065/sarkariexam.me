'use client';

import { useQuery, useMutation } from '@tanstack/react-query';
import { getUserFeedback, getCommentsPending, moderateComment, getEngagementMetrics } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MessageSquare, ThumbsUp, Flag, CheckCircle, XCircle, Loader2, Users, Bookmark } from 'lucide-react';
import { useState } from 'react';

export function EngagementPage() {
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const { data: metrics } = useQuery({
    queryKey: ['engagement-metrics'],
    queryFn: async () => {
      const res = await getEngagementMetrics(30);
      return res.data;
    },
  });

  const { data: feedback, isLoading: loadingFeedback, refetch: refetchFeedback } = useQuery({
    queryKey: ['user-feedback'],
    queryFn: async () => {
      const res = await getUserFeedback(50);
      return res.data;
    },
  });

  const { data: comments, isLoading: loadingComments, refetch: refetchComments } = useQuery({
    queryKey: ['comments-pending'],
    queryFn: async () => {
      const res = await getCommentsPending(50);
      return res.data;
    },
  });

  const moderateMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'approve' | 'reject' }) => moderateComment(id, action),
    onSuccess: () => {
      toast.success('Comment moderated');
      refetchComments();
      setRejectingId(null);
      setRejectionReason('');
    },
    onError: () => toast.error('Failed to moderate'),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Engagement</h1>
        <p className="text-muted-foreground mt-1">Feedback, comments moderation, and engagement metrics</p>
      </div>

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Feedback (30d)</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.feedbackCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comments (30d)</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.commentsCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bookmarks (30d)</CardTitle>
            <Bookmark className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.bookmarksCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="comments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="comments" className="flex items-center gap-1.5">
            <Flag className="h-4 w-4" />
            Pending Comments ({comments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="feedback" className="flex items-center gap-1.5">
            <ThumbsUp className="h-4 w-4" />
            User Feedback ({feedback?.length || 0})
          </TabsTrigger>
        </TabsList>

        {/* Comments Tab */}
        <TabsContent value="comments">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Comment Moderation</CardTitle>
              <CardDescription>Review and approve or reject user comments</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingComments ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : !comments || comments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending comments</p>
              ) : (
                <div className="space-y-4">
                  {comments?.map((comment: any) => (
                    <div key={comment._id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{comment.authorName || 'Anonymous'}</span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <Badge variant="secondary">{comment.type || 'comment'}</Badge>
                      </div>
                      <p className="text-sm">{comment.content}</p>
                      
                      {rejectingId === comment._id ? (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Reason for rejection (optional)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={2}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => moderateMutation.mutate({ id: comment._id, action: 'reject' })}
                              disabled={moderateMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Confirm Reject
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setRejectingId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => moderateMutation.mutate({ id: comment._id, action: 'approve' })}
                            disabled={moderateMutation.isPending}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectingId(comment._id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">User Feedback</CardTitle>
              <CardDescription>Recent user submissions and feedback</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingFeedback ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : !feedback || feedback.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No feedback yet</p>
              ) : (
                <div className="space-y-3">
                  {feedback?.map((item: any) => (
                    <div key={item._id} className="flex items-start justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant={item.type === 'bug' ? 'destructive' : item.type === 'feature' ? 'default' : 'secondary'}>
                            {item.type}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {new Date(item.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="font-medium">{item.title || 'Untitled'}</p>
                        <p className="text-sm text-muted-foreground">{item.message}</p>
                        {item.email && (
                          <p className="text-xs text-muted-foreground">From: {item.email}</p>
                        )}
                      </div>
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
