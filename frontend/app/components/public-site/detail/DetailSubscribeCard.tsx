import { BellRing, MessageCircleMore } from 'lucide-react';
import Link from 'next/link';
import { buildCommunityPath, type AnnouncementDetailContent } from '@/app/lib/public-content';
import { DetailSidebarCard } from './DetailSidebarCard';

export function DetailSubscribeCard({
  prompt,
}: {
  prompt: AnnouncementDetailContent['subscribePrompt'];
}) {
  if (!prompt) {
    return null;
  }

  return (
    <DetailSidebarCard title={prompt.title}>
      <div className="space-y-3 p-4">
        <p className="text-sm leading-7 text-gray-600">{prompt.description}</p>
        <div className="grid gap-2">
          <Link
            href={buildCommunityPath('telegram')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-95"
          >
            <BellRing size={14} />
            {prompt.buttonLabel}
          </Link>
          <Link
            href={buildCommunityPath('whatsapp')}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-[#f8fafc] px-4 py-2.5 text-sm font-semibold text-gray-700 transition-colors hover:border-[#f1ccb6] hover:bg-[#fff7f1] hover:text-[#bf360c]"
          >
            <MessageCircleMore size={14} />
            WhatsApp Channel
          </Link>
        </div>
      </div>
    </DetailSidebarCard>
  );
}
