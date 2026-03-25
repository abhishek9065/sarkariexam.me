'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { generateMetaWithAI, suggestTagsWithAI, generateSocialSummaryWithAI } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Sparkles, Wand2, Hash, Share2, Loader2, Copy, Check } from 'lucide-react';

interface AIAssistantPanelProps {
  title: string;
  content: string;
  organization?: string;
  deadline?: string;
  existingTags: string[];
  onTagsSuggested: (tags: string[]) => void;
  onMetaGenerated: (meta: { metaTitle: string; metaDescription: string }) => void;
}

export function AIAssistantPanel({
  title,
  content,
  organization,
  deadline,
  existingTags,
  onTagsSuggested,
  onMetaGenerated,
}: AIAssistantPanelProps) {
  const [socialSummary, setSocialSummary] = useState('');
  const [copied, setCopied] = useState(false);

  const metaMutation = useMutation({
    mutationFn: generateMetaWithAI,
    onSuccess: (res) => {
      onMetaGenerated(res.data);
      toast.success('SEO meta tags generated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to generate meta'),
  });

  const tagsMutation = useMutation({
    mutationFn: suggestTagsWithAI,
    onSuccess: (res) => {
      const newTags = res.data.map(t => t.tag).filter(t => !existingTags.includes(t));
      if (newTags.length > 0) {
        onTagsSuggested([...existingTags, ...newTags]);
        toast.success(`${newTags.length} tags suggested`);
      } else {
        toast.info('No new tags to add');
      }
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to suggest tags'),
  });

  const socialMutation = useMutation({
    mutationFn: generateSocialSummaryWithAI,
    onSuccess: (res) => {
      setSocialSummary(res.data.summary);
      toast.success('Social media summary generated');
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to generate summary'),
  });

  const canGenerate = title.length >= 5 && content.length >= 10;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(socialSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Copied to clipboard');
  };

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-purple-500" />
          AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!canGenerate && (
          <p className="text-xs text-muted-foreground">
            Enter a title and description to unlock AI features
          </p>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          disabled={!canGenerate || metaMutation.isPending}
          onClick={() => metaMutation.mutate({ title, content, organization })}
        >
          {metaMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Wand2 className="h-4 w-4 mr-2" />
          )}
          Generate SEO Meta
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          disabled={!canGenerate || tagsMutation.isPending}
          onClick={() => tagsMutation.mutate({ title, content, organization, existingTags })}
        >
          {tagsMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Hash className="h-4 w-4 mr-2" />
          )}
          Suggest Tags
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          disabled={!canGenerate || socialMutation.isPending}
          onClick={() => socialMutation.mutate({ title, content, deadline })}
        >
          {socialMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Share2 className="h-4 w-4 mr-2" />
          )}
          Social Media Summary
        </Button>

        {socialSummary && (
          <div className="mt-3 p-3 bg-muted rounded-md text-sm">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs leading-relaxed">{socialSummary}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {socialSummary.length}/280 chars
            </p>
          </div>
        )}

        {existingTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {existingTags.map(tag => (
              <Badge key={tag} variant="secondary" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
