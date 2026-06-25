'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  BarChart3,
  Copy,
  Download,
  Eye,
  Loader2,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Send,
  Smartphone,
} from 'lucide-react';

import {
  createCampaign,
  estimateCampaign,
  getCampaigns,
  getCampaignStats,
  getSegments,
  retryFailedCampaign,
  sendCampaign,
  type CampaignDeliveryStats,
  type CampaignRecipientEstimate,
} from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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

type Campaign = Awaited<ReturnType<typeof getCampaigns>>['data'][number];
type SegmentData = Awaited<ReturnType<typeof getSegments>>['data'];
type CampaignForm = {
  title: string;
  body: string;
  url: string;
  segmentType: string;
  segmentValue: string;
  scheduledAt: string;
};
type FormErrors = Partial<Record<keyof CampaignForm, string>>;

const emptyForm: CampaignForm = {
  title: '',
  body: '',
  url: '',
  segmentType: 'all',
  segmentValue: 'all',
  scheduledAt: '',
};

const segmentTypes = [
  { value: 'all', label: 'All subscribers' },
  { value: 'state', label: 'State' },
  { value: 'category', label: 'Category' },
  { value: 'organization', label: 'Organization' },
  { value: 'qualification', label: 'Qualification' },
  { value: 'type', label: 'Content type' },
];

const contentTypes = ['job', 'result', 'admit-card', 'answer-key', 'admission', 'syllabus'];
const LARGE_SEND_WARN_THRESHOLD = 1_000;
const VERY_LARGE_SEND_WARN_THRESHOLD = 10_000;

const statusClass: Record<string, string> = {
  draft: 'border-slate-200 bg-slate-50 text-slate-700',
  scheduled: 'border-blue-200 bg-blue-50 text-blue-700',
  sending: 'border-amber-200 bg-amber-50 text-amber-700',
  sent: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  partial_failed: 'border-amber-200 bg-amber-50 text-amber-700',
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

function toLocalDateTime(value?: string) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() <= Date.now()) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function statusLabel(campaign: Campaign) {
  return campaign.unsupportedSegment ? 'unsupported' : campaign.status;
}

function segmentLabel(segment: Campaign['segment']) {
  const type = segmentTypes.find((item) => item.value === segment.type)?.label ?? segment.type;
  return segment.type === 'all' ? type : `${type}: ${segment.value}`;
}

function segmentParts(segment: Campaign['segment']) {
  return {
    type: segmentTypes.find((item) => item.value === segment.type)?.label ?? segment.type,
    value: segment.type === 'all' ? 'All active subscribers' : segment.value,
  };
}

function sendBlockReason(campaign: Campaign) {
  if (campaign.unsupportedSegment) return 'Unsupported legacy segment cannot be sent.';
  if (campaign.status === 'sent') return 'Campaign has already been sent.';
  if (campaign.status === 'sending') return 'Campaign is already sending.';
  if (campaign.status === 'partial_failed') return 'Use Retry all failed for partial failures.';
  if (campaign.status === 'simulated') return 'Simulated campaigns cannot be sent.';
  return null;
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
  const [segments, setSegments] = useState<SegmentData | null>(null);
  const [segmentsLoading, setSegmentsLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'duplicate'>('create');
  const [form, setForm] = useState<CampaignForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);
  const [sendAuditReason, setSendAuditReason] = useState('');
  const [missingEstimateConfirmed, setMissingEstimateConfirmed] = useState(false);
  const [sendConfirmationText, setSendConfirmationText] = useState('');

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedId) ?? campaigns[0],
    [campaigns, selectedId],
  );

  async function loadCampaigns(preferredId?: string) {
    setLoading(true);
    try {
      const response = await getCampaigns();
      setCampaigns(response.data);
      setSelectedId((current) => preferredId ?? current ?? response.data[0]?.id ?? null);
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
    void getSegments()
      .then((response) => setSegments(response.data))
      .catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load segments.'))
      .finally(() => setSegmentsLoading(false));
  }, []);

  useEffect(() => {
    setEstimate(null);
    setStats(null);
    setSendAuditReason('');
    setMissingEstimateConfirmed(false);
    setSendConfirmationText('');
    if (selectedCampaign?.id) void loadStats(selectedCampaign.id);
  }, [selectedCampaign?.id]);

  useEffect(() => {
    if (!selectedCampaign?.id || selectedCampaign.status !== 'sending') return;

    const campaignId = selectedCampaign.id;
    const interval = window.setInterval(() => {
      void Promise.all([getCampaigns(), getCampaignStats(campaignId)])
        .then(([campaignResponse, statsResponse]) => {
          setCampaigns(campaignResponse.data);
          setStats(statsResponse.data);
        })
        .catch(() => undefined);
    }, 3_000);

    return () => window.clearInterval(interval);
  }, [selectedCampaign?.id, selectedCampaign?.status]);

  function openCreateForm() {
    setFormMode('create');
    setForm(emptyForm);
    setFormErrors({});
    setFormOpen(true);
  }

  function openDuplicateForm() {
    if (!selectedCampaign) return;
    setFormMode('duplicate');
    setForm({
      title: `${selectedCampaign.title} (copy)`,
      body: selectedCampaign.body,
      url: selectedCampaign.url ?? '',
      segmentType: selectedCampaign.unsupportedSegment ? 'all' : selectedCampaign.segment.type,
      segmentValue: selectedCampaign.unsupportedSegment ? 'all' : selectedCampaign.segment.value,
      scheduledAt: toLocalDateTime(selectedCampaign.scheduledAt),
    });
    setFormErrors({});
    setFormOpen(true);
  }

  function updateForm<K extends keyof CampaignForm>(key: K, value: CampaignForm[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFormErrors((current) => ({ ...current, [key]: undefined }));
  }

  function resetSendSafetyState() {
    setSendAuditReason('');
    setMissingEstimateConfirmed(false);
    setSendConfirmationText('');
  }

  function validateForm(mode: 'draft' | 'scheduled') {
    const errors: FormErrors = {};
    if (!form.title.trim()) errors.title = 'Title is required.';
    else if (form.title.trim().length < 5) errors.title = 'Title must be at least 5 characters.';
    if (!form.body.trim()) errors.body = 'Body is required.';
    else if (form.body.trim().length < 10) errors.body = 'Body must be at least 10 characters.';
    if (!form.segmentType) errors.segmentType = 'Segment is required.';
    if (form.segmentType !== 'all' && !form.segmentValue.trim()) {
      errors.segmentValue = 'Segment value is required.';
    }
    if (form.url.trim()) {
      try {
        new URL(form.url.trim());
      } catch {
        errors.url = 'Enter a valid absolute URL.';
      }
    }
    if (form.scheduledAt && new Date(form.scheduledAt).getTime() <= Date.now()) {
      errors.scheduledAt = 'Scheduled date must be in the future.';
    }
    if (mode === 'scheduled' && !form.scheduledAt) {
      errors.scheduledAt = 'Choose a future date to schedule this campaign.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function submitCampaign(mode: 'draft' | 'scheduled') {
    if (!validateForm(mode)) return;
    setBusyAction(`create-${mode}`);
    try {
      const response = await createCampaign({
        title: form.title.trim(),
        body: form.body.trim(),
        url: form.url.trim() || undefined,
        segment: {
          type: form.segmentType,
          value: form.segmentType === 'all' ? 'all' : form.segmentValue.trim(),
        },
        scheduledAt: mode === 'scheduled' ? new Date(form.scheduledAt).toISOString() : undefined,
      });
      toast.success(mode === 'scheduled' ? 'Campaign scheduled.' : 'Campaign saved as draft.');
      setFormOpen(false);
      await loadCampaigns(response.data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create campaign.');
    } finally {
      setBusyAction(null);
    }
  }

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
    const blocked = sendBlockReason(selectedCampaign);
    if (blocked) {
      toast.error(blocked);
      return;
    }
    if (!estimate && !missingEstimateConfirmed) {
      toast.error('Load a recipient estimate or explicitly confirm sending without one.');
      return;
    }
    if (!sendConfirmationSatisfied) {
      toast.error('Enter the required confirmation phrase before sending.');
      return;
    }
    const auditReason = sendAuditReason.trim();
    if (auditReason.length < 3) {
      toast.error('Audit reason is required before sending a campaign.');
      return;
    }
    setBusyAction('send');
    try {
      await sendCampaign(selectedCampaign.id, buildSendAuditNote(auditReason));
      setSendConfirmOpen(false);
      resetSendSafetyState();
      toast.success('Campaign delivery queued.');
      await loadCampaigns(selectedCampaign.id);
      await loadStats(selectedCampaign.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send campaign.');
    } finally {
      setBusyAction(null);
    }
  }

  async function runRetry() {
    if (!selectedCampaign) return;
    const auditReason = window.prompt(`Audit reason for retrying failed deliveries for "${selectedCampaign.title}"`);
    if (auditReason === null) return;
    if (auditReason.trim().length < 3) {
      toast.error('Audit reason is required before retrying failed deliveries.');
      return;
    }
    setBusyAction('retry');
    try {
      await retryFailedCampaign(selectedCampaign.id, auditReason.trim());
      toast.success('All failed deliveries queued for retry.');
      await loadCampaigns(selectedCampaign.id);
      await loadStats(selectedCampaign.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to retry campaign.');
    } finally {
      setBusyAction(null);
    }
  }

  function buildSendAuditNote(reason: string) {
    if (!selectedCampaign) return reason;
    const context = [
      estimate
        ? `estimate=${estimate.total} total/${estimate.email} email/${estimate.push} push`
        : 'estimate=missing-confirmed',
      `segment=${segmentLabel(selectedCampaign.segment)}`,
      selectedCampaign.scheduledAt ? `scheduledAt=${formatDate(selectedCampaign.scheduledAt)}` : undefined,
    ].filter(Boolean);
    return `${reason} | ${context.join(' | ')}`.slice(0, 500);
  }

  const segmentValues = form.segmentType === 'state'
    ? segments?.segments.states ?? []
    : form.segmentType === 'category'
      ? segments?.segments.categories ?? []
      : form.segmentType === 'type'
        ? contentTypes
        : [];
  const segmentCount = segments?.counts.find(
    (item) => item.type === form.segmentType && item.value === (form.segmentType === 'all' ? 'all' : form.segmentValue),
  )?.count;
  const emailStats = stats?.byChannel.find((item) => item.channel === 'email');
  const pushStats = stats?.byChannel.find((item) => item.channel === 'push');
  const attempts = stats?.total ?? (selectedCampaign ? selectedCampaign.sentCount + selectedCampaign.failedCount : 0);
  const progressPercentage = estimate && estimate.total > 0
    ? Math.min(100, Math.round((attempts / estimate.total) * 100))
    : null;
  const selectedSegment = selectedCampaign ? segmentParts(selectedCampaign.segment) : null;
  const currentSendBlockReason = selectedCampaign ? sendBlockReason(selectedCampaign) : 'Select a campaign before sending.';
  const hasRecipientEstimate = Boolean(estimate);
  const estimateTotal = estimate?.total ?? 0;
  const isLargeSend = hasRecipientEstimate && estimateTotal > LARGE_SEND_WARN_THRESHOLD;
  const isVeryLargeSend = hasRecipientEstimate && estimateTotal > VERY_LARGE_SEND_WARN_THRESHOLD;
  const requiredConfirmationPhrases = isVeryLargeSend && selectedCampaign
    ? [selectedCampaign.title.trim(), 'SEND TO ALL'].filter(Boolean)
    : isLargeSend
      ? ['SEND']
      : [];
  const sendConfirmationSatisfied = requiredConfirmationPhrases.length === 0
    || requiredConfirmationPhrases.some((phrase) => sendConfirmationText.trim() === phrase);
  const estimateGateSatisfied = hasRecipientEstimate || missingEstimateConfirmed;
  const sendReady = !currentSendBlockReason
    && estimateGateSatisfied
    && sendAuditReason.trim().length >= 3
    && sendConfirmationSatisfied;
  const estimateWarningClass = isVeryLargeSend
    ? 'border-red-300 bg-red-50 text-red-800'
    : isLargeSend
      ? 'border-amber-300 bg-amber-50 text-amber-800'
      : 'border-emerald-200 bg-emerald-50 text-emerald-800';

  if (loading && campaigns.length === 0) {
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
          <h2 className="text-[18px] font-extrabold text-foreground">Campaign Management</h2>
          <p className="text-[12px] text-muted-foreground">Create, schedule, estimate, send, and monitor notification campaigns.</p>
        </div>
        <div className="flex gap-2">
          <Button type="button" onClick={openCreateForm}>
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
          <Button type="button" variant="outline" onClick={() => void loadCampaigns()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(340px,0.9fr)_minmax(520px,1.1fr)]">
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-[11px] font-bold uppercase text-muted-foreground">Campaigns</p>
          </div>
          <div className="max-h-[680px] overflow-y-auto">
            {campaigns.length === 0 ? (
              <p className="px-4 py-8 text-sm text-muted-foreground">No campaigns found. Create the first campaign to get started.</p>
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
                      <p className="mt-1 text-[12px] text-muted-foreground">{segmentLabel(campaign.segment)}</p>
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
                  <Button type="button" variant="outline" onClick={openDuplicateForm} disabled={busyAction !== null}>
                    <Copy className="h-4 w-4" />
                    Duplicate
                  </Button>
                  <Button type="button" variant="outline" onClick={runEstimate} disabled={busyAction !== null || selectedCampaign.unsupportedSegment}>
                    {busyAction === 'estimate' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                    Estimate
                  </Button>
                  <Button
                    type="button"
                    onClick={() => { resetSendSafetyState(); setSendConfirmOpen(true); }}
                    disabled={busyAction !== null || Boolean(currentSendBlockReason)}
                    title={currentSendBlockReason || undefined}
                  >
                    <Send className="h-4 w-4" />
                    Send now
                  </Button>
                  <Button type="button" variant="outline" onClick={runRetry} disabled={busyAction !== null || selectedCampaign.status === 'sending' || selectedCampaign.unsupportedSegment || (stats?.failed ?? selectedCampaign.failedCount) === 0}>
                    {busyAction === 'retry' ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                    Retry all failed
                  </Button>
                </div>
              </div>

              {selectedCampaign.unsupportedSegment ? (
                <div className="mt-4 flex gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  This legacy segment is unsupported and cannot be estimated or sent. Duplicate it to retarget a supported segment.
                </div>
              ) : null}
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <h4 className="text-sm font-bold text-foreground">Live Delivery Progress</h4>
                </div>
                <Badge className={statusClass[statusLabel(selectedCampaign)] ?? statusClass.draft} variant="outline">
                  {statusLabel(selectedCampaign)}
                </Badge>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <ChannelStat label="Sent" value={stats?.sent ?? selectedCampaign.sentCount} icon={Send} />
                <ChannelStat label="Failed" value={stats?.failed ?? selectedCampaign.failedCount} icon={AlertTriangle} />
                <ChannelStat label="Total attempts" value={attempts} icon={BarChart3} />
              </div>
              <div className="mt-4">
                <div className="mb-1.5 flex justify-between text-xs text-muted-foreground">
                  <span>{progressPercentage === null ? 'Estimate required to calculate progress' : 'Delivery progress'}</span>
                  <span>{progressPercentage === null ? '—' : `${progressPercentage}%`}</span>
                </div>
                <Progress value={progressPercentage ?? 0} aria-label="Campaign delivery progress" />
              </div>
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
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h4 className="mb-3 text-sm font-bold text-foreground">Schedule</h4>
              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                <p>Created: {formatDate(selectedCampaign.createdAt)}</p>
                <p>Scheduled: {formatDate(selectedCampaign.scheduledAt)}</p>
                <p>Sent: {formatDate(selectedCampaign.sentAt)}</p>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
                <h4 className="text-sm font-bold text-foreground">Recent Failed Deliveries</h4>
                <Button type="button" size="sm" variant="outline" disabled title="Failed-recipient export is not available from the backend yet.">
                  <Download className="h-4 w-4" />
                  Export not available yet
                </Button>
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

      <Dialog open={formOpen} onOpenChange={(open) => busyAction?.startsWith('create-') ? undefined : setFormOpen(open)}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{formMode === 'duplicate' ? 'Duplicate Campaign' : 'Create Campaign'}</DialogTitle>
            <DialogDescription>
              {formMode === 'duplicate'
                ? 'Review the copied content and choose whether to save it as a draft or schedule it.'
                : 'Create a draft now or provide a future date and schedule it.'}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); void submitCampaign('draft'); }}>
            <div className="space-y-1.5">
              <label htmlFor="campaign-title" className="text-sm font-semibold">Title</label>
              <Input id="campaign-title" value={form.title} onChange={(event) => updateForm('title', event.target.value)} maxLength={200} aria-invalid={Boolean(formErrors.title)} />
              {formErrors.title ? <p className="text-xs text-red-600">{formErrors.title}</p> : null}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="campaign-body" className="text-sm font-semibold">Body</label>
              <Textarea id="campaign-body" value={form.body} onChange={(event) => updateForm('body', event.target.value)} maxLength={1000} rows={5} aria-invalid={Boolean(formErrors.body)} />
              {formErrors.body ? <p className="text-xs text-red-600">{formErrors.body}</p> : null}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="campaign-url" className="text-sm font-semibold">URL</label>
              <Input id="campaign-url" type="url" value={form.url} onChange={(event) => updateForm('url', event.target.value)} placeholder="https://sarkariexam.me/..." aria-invalid={Boolean(formErrors.url)} />
              {formErrors.url ? <p className="text-xs text-red-600">{formErrors.url}</p> : null}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Segment type</label>
                <Select
                  value={form.segmentType}
                  onValueChange={(value) => {
                    updateForm('segmentType', value);
                    updateForm('segmentValue', value === 'all' ? 'all' : '');
                  }}
                >
                  <SelectTrigger aria-invalid={Boolean(formErrors.segmentType)}><SelectValue placeholder="Choose segment" /></SelectTrigger>
                  <SelectContent>
                    {segmentTypes.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                {formErrors.segmentType ? <p className="text-xs text-red-600">{formErrors.segmentType}</p> : null}
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-semibold">Segment value</label>
                {form.segmentType === 'all' ? (
                  <Input value="All active subscribers" disabled />
                ) : segmentValues.length > 0 ? (
                  <Select value={form.segmentValue} onValueChange={(value) => updateForm('segmentValue', value)}>
                    <SelectTrigger aria-invalid={Boolean(formErrors.segmentValue)}><SelectValue placeholder={segmentsLoading ? 'Loading segments…' : 'Choose value'} /></SelectTrigger>
                    <SelectContent>
                      {segmentValues.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input value={form.segmentValue} onChange={(event) => updateForm('segmentValue', event.target.value)} placeholder={`Enter ${form.segmentType}`} aria-invalid={Boolean(formErrors.segmentValue)} />
                )}
                {formErrors.segmentValue ? <p className="text-xs text-red-600">{formErrors.segmentValue}</p> : null}
                {segmentCount !== undefined ? <p className="text-xs text-muted-foreground">{segmentCount.toLocaleString('en-IN')} matching subscribers</p> : null}
              </div>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="campaign-scheduled-at" className="text-sm font-semibold">Scheduled date</label>
              <Input id="campaign-scheduled-at" type="datetime-local" value={form.scheduledAt} min={toLocalDateTime(new Date(Date.now() + 60_000).toISOString())} onChange={(event) => updateForm('scheduledAt', event.target.value)} aria-invalid={Boolean(formErrors.scheduledAt)} />
              {formErrors.scheduledAt ? <p className="text-xs text-red-600">{formErrors.scheduledAt}</p> : <p className="text-xs text-muted-foreground">Required only when scheduling.</p>}
            </div>
            <DialogFooter className="sticky -bottom-4">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={busyAction?.startsWith('create-')}>Cancel</Button>
              <Button type="submit" variant="outline" disabled={busyAction?.startsWith('create-')}>
                {busyAction === 'create-draft' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save as draft
              </Button>
              <Button type="button" onClick={() => void submitCampaign('scheduled')} disabled={busyAction?.startsWith('create-')}>
                {busyAction === 'create-scheduled' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Schedule campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={sendConfirmOpen} onOpenChange={(open) => { if (busyAction !== 'send') { setSendConfirmOpen(open); if (!open) resetSendSafetyState(); } }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confirm campaign delivery</DialogTitle>
            <DialogDescription>This action queues real email and push deliveries and cannot be undone.</DialogDescription>
          </DialogHeader>
          {selectedCampaign ? (
            <div className="space-y-4">
              {currentSendBlockReason ? (
                <div className="flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  {currentSendBlockReason}
                </div>
              ) : null}
              <div className="grid gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Campaign</p>
                  <p className="mt-1 font-bold text-foreground">{selectedCampaign.title}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Status</p>
                  <p className="mt-1 font-bold text-foreground">{statusLabel(selectedCampaign)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Segment type</p>
                  <p className="mt-1 font-bold text-foreground">{selectedSegment?.type}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Segment value</p>
                  <p className="mt-1 font-bold text-foreground">{selectedSegment?.value}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Scheduled</p>
                  <p className="mt-1 font-bold text-foreground">{formatDate(selectedCampaign.scheduledAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Created</p>
                  <p className="mt-1 font-bold text-foreground">{formatDate(selectedCampaign.createdAt)}</p>
                </div>
              </div>
              {estimate ? (
                <div className={`rounded-lg border p-4 ${estimateWarningClass}`}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase">Recipient estimate</p>
                      <p className="mt-1 text-2xl font-extrabold">{estimate.total.toLocaleString('en-IN')}</p>
                    </div>
                    <div className="text-right text-sm font-semibold">
                      <p>{estimate.email.toLocaleString('en-IN')} email</p>
                      <p>{estimate.push.toLocaleString('en-IN')} push</p>
                    </div>
                  </div>
                  {isVeryLargeSend ? (
                    <div className="mt-3 flex gap-2 rounded-md border border-red-300 bg-white/60 p-3 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Very large send: more than {VERY_LARGE_SEND_WARN_THRESHOLD.toLocaleString('en-IN')} recipients. Confirm the campaign title or type SEND TO ALL.
                    </div>
                  ) : isLargeSend ? (
                    <div className="mt-3 flex gap-2 rounded-md border border-amber-300 bg-white/60 p-3 text-sm">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      Large send: more than {LARGE_SEND_WARN_THRESHOLD.toLocaleString('en-IN')} recipients. Type SEND to continue.
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                  <div className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-bold">No recipient estimate is loaded.</p>
                      <p className="mt-1">Load an estimate before sending, or explicitly confirm that this campaign must be sent without one.</p>
                    </div>
                  </div>
                  <label className="flex items-start gap-2 rounded-md border border-amber-300 bg-white/60 p-3">
                    <Checkbox
                      checked={missingEstimateConfirmed}
                      onCheckedChange={(checked) => setMissingEstimateConfirmed(checked === true)}
                      aria-label="Confirm sending without recipient estimate"
                    />
                    <span>I understand no recipient estimate is loaded and want to continue.</span>
                  </label>
                </div>
              )}
              {requiredConfirmationPhrases.length > 0 ? (
                <div className="space-y-1.5">
                  <label htmlFor="campaign-send-confirmation" className="text-sm font-semibold">
                    Type {isVeryLargeSend ? 'the campaign title or SEND TO ALL' : 'SEND'} to confirm
                  </label>
                  <Input
                    id="campaign-send-confirmation"
                    value={sendConfirmationText}
                    onChange={(event) => setSendConfirmationText(event.target.value)}
                    autoComplete="off"
                    aria-invalid={sendConfirmationText.length > 0 && !sendConfirmationSatisfied}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label htmlFor="campaign-send-reason" className="text-sm font-semibold">Audit reason</label>
            <Textarea
              id="campaign-send-reason"
              value={sendAuditReason}
              onChange={(event) => setSendAuditReason(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Operational reason for sending this campaign now"
              aria-invalid={sendAuditReason.trim().length > 0 && sendAuditReason.trim().length < 3}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Required before delivery is queued.</span>
              <span>{sendAuditReason.length}/500</span>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => { setSendConfirmOpen(false); resetSendSafetyState(); }} disabled={busyAction === 'send'}>Cancel</Button>
            <Button type="button" onClick={runSend} disabled={busyAction === 'send' || !sendReady}>
              {busyAction === 'send' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Confirm and send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
