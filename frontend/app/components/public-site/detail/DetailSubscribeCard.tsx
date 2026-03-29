'use client';

import { Send } from 'lucide-react';
import { useState } from 'react';
import type { AnnouncementDetailContent } from '@/app/lib/public-content';
import { DetailSidebarCard } from './DetailSidebarCard';

export function DetailSubscribeCard({
  prompt,
}: {
  prompt: AnnouncementDetailContent['subscribePrompt'];
}) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!prompt) {
    return null;
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) {
      return;
    }

    setSubmitted(true);
    setEmail('');
  }

  return (
    <DetailSidebarCard title={prompt.title}>
      <div className="space-y-3 p-4">
        <p className="text-sm leading-7 text-gray-600">{prompt.description}</p>
        {submitted ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">
            Alert preference captured for this browser session.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition-colors focus:border-orange-300"
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-[linear-gradient(135deg,#e65100,#bf360c)] px-4 py-2 text-sm font-bold text-white transition-opacity hover:opacity-95"
            >
              <Send size={14} />
              {prompt.buttonLabel}
            </button>
          </form>
        )}
      </div>
    </DetailSidebarCard>
  );
}
