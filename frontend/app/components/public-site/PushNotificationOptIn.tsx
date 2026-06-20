'use client';

import { Bell, BellOff, LoaderCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { resolvePublicApiBase } from '@/lib/api';
import { subscribePush } from '@/lib/user-api';
import { cn } from '@/lib/utils';

type State = 'idle' | 'unsupported' | 'denied' | 'loading' | 'enabled' | 'failed';
function decodeKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushNotificationOptIn({ compact = false }: { compact?: boolean }) {
  const [state, setState] = useState<State>('idle');
  const [message, setMessage] = useState('Get browser alerts for important updates.');
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
      setState('unsupported'); setMessage('Browser notifications are not supported on this device.'); return;
    }
    if (Notification.permission === 'denied') {
      setState('denied'); setMessage('Notifications are blocked in your browser settings.'); return;
    }
    navigator.serviceWorker.getRegistration('/').then((registration) => registration?.pushManager.getSubscription()).then((value) => {
      if (value) { setState('enabled'); setMessage('Browser notifications are enabled.'); }
    }).catch(() => undefined);
  }, []);

  async function enable() {
    try {
      setState('loading');
      if (await Notification.requestPermission() !== 'granted') {
        setState('denied'); setMessage('Permission was not granted. You can enable it in browser settings.'); return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      let key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        const response = await fetch(`${resolvePublicApiBase()}/push/vapid-public-key`);
        const body = await response.json().catch(() => null);
        key = body?.publicKey;
      }
      if (!key) throw new Error('Push notifications are not configured.');
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(key) });
      await subscribePush(subscription.toJSON());
      setState('enabled'); setMessage('Browser notifications are enabled.');
    } catch (error) {
      setState('failed'); setMessage(error instanceof Error ? error.message : 'Could not enable notifications.');
    }
  }

  const disabled = ['unsupported', 'denied', 'loading', 'enabled'].includes(state);
  return (
    <div className={cn('rounded-xl border border-orange-100 bg-orange-50/60', compact ? 'p-3' : 'p-4')}>
      <button type="button" disabled={disabled} onClick={enable} className="flex w-full items-center gap-3 text-left disabled:cursor-default">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-[#e65100]">
          {state === 'loading' ? <LoaderCircle size={16} className="animate-spin" /> : state === 'denied' || state === 'unsupported' ? <BellOff size={16} /> : <Bell size={16} />}
        </span>
        <span><span className="block text-xs font-bold text-gray-800">{state === 'enabled' ? 'Notifications enabled' : 'Enable browser alerts'}</span><span className="block text-[11px] leading-5 text-gray-500">{message}</span></span>
      </button>
    </div>
  );
}
