'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BarChart3,
  Eye,
  Loader2,
  Mail,
  RefreshCw,
  RotateCcw,
  Send,
  Smartphone,
} from 'lucide-react';

import {
  estimateCampaign,
  getCampaigns,
  getCampaignStats,
  retryFailedCampaign,
  sendCampaign,
  type CampaignDeliveryStats,
  type CampaignRecipientEstimate,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type Campaign = Awaited<ReturnType<typeof getCampaigns>>['data'][number];

const statusClass: Record<string, string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  sending: 'border-amber-200 bg-amber-50 text-amber-700',
  sent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  simulated: 'border-purple-200 bg-purple-50 text-purple-700',
  failed: 'border-red-200 bg-red-50 text-red-700',
  unsupported: 'border-red-200 bg-red-50 text-red-700',
};

function formatDate(value?: string) {
  if (!value) return 'Not set';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusLabel(campaign: Campaign) {
  return campaign.unsupportedSegment ? 'unsupported' : campaign.status;
}

function ChannelStat({ label, value, icon: Icon }: { label: string; value: number; icon: typeof Mail }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <div>
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</p>
        <p className="text-sm font-bold text-foreground">{value.toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}

export function NotificationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<CampaignRecipientEstimate | null>(null);
  const [stats, setStats] = useState<CampaignDeliveryStats | null>(null);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0],
    [campaigns, selectedId],
  );

  async function loadCampaigns() {
    setLoading(true);
    try {
      const response = await getCampaigns();
      setCampaigns(response.data);
      setSelectedId((current) => current ?? response.data[0]?.id ?? null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to load campaigns.');
    } finally {
      setLoading(false);
    }
  }

  async function loadStats(campaignId: string) {
    try {
      const response = await getCampaignStats(campaignId);
      setStats(response.data);
    } catch {
      setStats(null);
    }
  }

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    setEstimate(null);
    setStats(null);
    if (selectedCampaign?.id) {
      void loadStats(selectedCampaign.id);
    }
  }, [selectedCampaign?.id]);

  async function runEstimate() {
    if (!selectedCampaign) return;
    setBusyAction('estimate');
    try {
      const response = await estimateCampaign(selectedCampaign.id);
      setEstimate(response.data);
      toast.success('Recipient estimate loaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to estimate recipients.');
    } finally {
      setBusyAction(null);
    }
  }

  async function runSend() {
    if (!selectedCampaign) return;
    const confirmed = window.confirm(`Send campaign "${selectedCampaign.title}" now?`);
    if (!confirmed) return;
    setBusyAction('send');
    try {
      const response = await sendCampaign(selectedCampaign.id);
      toast.success(`Campaign sent: ${response.data.sentCount} delivered, ${response.data.failedCount} failed.`);
      await loadCampaigns();
      await loadStats(selectedCampaign.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send campaign.');
    } finally {
      setBusyAction(null);
    }
  }

  async function runRetry() {
    if (!selectedCampaign) return;
    const confirmed = window.confirm(`Retry failed deliveries for "${selectedCampaign.title}"?`);
    if (!confirmed) return;
    setBusyAction('retry');
    try {
      const response = await retryFailedCampaign(selectedCampaign.id);
      toast.success(`Retried ${response.data.retried}: ${response.data.sentCount} delivered, ${response.data.failedCount} failed.`);
      await loadCampaigns();
      await loadStats(selectedCampaign.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to retry campaign.');
    } finally {
      setBusyAction(null);
    }
  }

  const emailStats = stats?.byChannel.find((item) => item.channel === 'email');
  const pushStats = stats?.byChannel.find((item) => item.channel === 'push');
  const actionDisabled = !selectedCampaign || selectedCampaign.unsupportedSegment || selectedCampaign.status === 'sending' || selectedCampaign.status === 'sent';

  if (loading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[18px] font-extrabold text-foreground">Campaign Delivery</h2>
          <p className="text-[12px] text-muted-foreground">Preview, estimate, send, and retry notification campaigns.</p>
        </div>
        <Button type="button" variant="outline" onClick={loadCampaigns}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(520px,1.1fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Campaigns</p>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {campaigns.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">No campaigns found.</p>
            ) : campaigns.map((campaign) => {
              const label = statusLabel(campaign);
              return (
                <button
                  key={campaign.id}
                  type="button"
                  onClick={() => setSelectedId(campaign.id)}
                  className={`w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted/60 ${selectedCampaign?.id === campaign.id ? 'bg-muted' : 'bg-card'}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-foreground">{campaign.title}</p>
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        {campaign.segment.type}: {campaign.segment.value || 'all'}
                      </p>
                    </div>
                    <Badge className={statusClass[label] ?? statusClass.draft} variant="outline">{label}</Badge>
                  </div>
                  <div className="mt-3 flex gap-3 text-[11px] text-muted-foreground">
                    <span>{campaign.sentCount.toLocaleString('en-IN')} sent</span>
                    <span>{campaign.failedCount.toLocaleString('en-IN')} failed</span>
                    <span>{formatDate(campaign.createdAt)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {selectedCampaign ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-extrabold text-foreground">{selectedCampaign.title}</h3>
                    <Badge className={statusClass[statusLabel(selectedCampaign)] ?? statusClass.draft} variant="outline">
                      {statusLabel(selectedCampaign)}
                    </Badge>
                  </div>
                  <p className="mt-2 max-w-2xl whitespace-pre-wrap text-sm text-muted-foreground">{selectedCampaign.body}</p>
                  {selectedCampaign.url ? (
                    <a href={selectedCampaign.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-sm font-semibold text-primary hover:underline">
                      {selectedCampaign.url}
                    </a>
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" onClick={runEstimate} disabled={busyAction !== null || selectedCampaign.unsupportedSegment}>
                    {busyAction === 'estimate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    Estimate
                  </Button>
                  <Button type="button" onClick={runSend} disabled={busyAction !== null || actionDisabled || selectedCampaign.status === 'simulated'}>
                    {busyAction === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Send now
                  </Button>
                  <Button type="button" variant="outline" onClick={runRetry} disabled={busyAction !== null || selectedCampaign.unsupportedSegment || (stats?.failed ?? selectedCampaign.failedCount) === 0}>
                    {busyAction === 'retry' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Retry failed
                  </Button>
                </div>
              </div>

              {selectedCampaign.unsupportedSegment ? (
                <div className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4" />
                  This legacy segment is unsupported and cannot be sent.
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-bold text-foreground">Recipient Estimate</h4>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <ChannelStat label="Email" value={estimate?.email ?? 0} icon={Mail} />
                  <ChannelStat label="Push" value={estimate?.push ?? 0} icon={Smartphone} />
                  <ChannelStat label="Total" value={estimate?.total ?? 0} icon={BarChart3} />
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-bold text-foreground">Delivery Stats</h4>
                </div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <ChannelStat label="Delivered" value={stats?.sent ?? selectedCampaign.sentCount} icon={Send} />
                  <ChannelStat label="Failed" value={stats?.failed ?? selectedCampaign.failedCount} icon={AlertTriangle} />
                  <ChannelStat label="Attempts" value={stats?.total ?? selectedCampaign.sentCount + selectedCampaign.failedCount} icon={BarChart3} />
                </div>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-bold text-foreground">Channel Breakdown</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between rounded-lg bg-muted px-3 py-2">
                    <span>Email</span>
                    <span>{emailStats?.sent ?? 0} sent / {emailStats?.failed ?? 0} failed</span>
                  </div>
                  <div className="flex justify-between rounded-lg bg-muted px-3 py-2">
                    <span>Push</span>
                    <span>{pushStats?.sent ?? 0} sent / {pushStats?.failed ?? 0} failed</span>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="mb-3 text-sm font-bold text-foreground">Schedule</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>Created: {formatDate(selectedCampaign.createdAt)}</p>
                  <p>Scheduled: {formatDate(selectedCampaign.scheduledAt)}</p>
                  <p>Sent: {formatDate(selectedCampaign.sentAt)}</p>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="border-b border-border px-4 py-3">
                <h4 className="text-sm font-bold text-foreground">Recent Failed Deliveries</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="bg-muted text-left text-[11px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-4 py-2">Channel</th>
                      <th className="px-4 py-2">Recipient</th>
                      <th className="px-4 py-2">Attempts</th>
                      <th className="px-4 py-2">Error</th>
                      <th className="px-4 py-2">Last attempt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(stats?.recentFailures ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">No failed deliveries recorded.</td>
                      </tr>
                    ) : stats?.recentFailures.map((failure) => (
                      <tr key={failure.id} className="border-t border-border">
                        <td className="px-4 py-2 font-semibold">{failure.channel}</td>
                        <td className="max-w-[260px] truncate px-4 py-2">{failure.recipient}</td>
                        <td className="px-4 py-2">{failure.attemptCount}</td>
                        <td className="max-w-[280px] truncate px-4 py-2 text-red-600">{failure.error || 'Unknown failure'}</td>
                        <td className="px-4 py-2">{formatDate(failure.lastAttemptAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
