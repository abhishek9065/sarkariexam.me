'use client';

import { Copy, Printer, Share2 } from 'lucide-react';
import type { ReactNode } from 'react';

function ActionButton({
  label,
  onClick,
  children,
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-white/15"
    >
      {children}
      {label}
    </button>
  );
}

export function DetailClientActions({
  title,
}: {
  title: string;
}) {
  async function handleCopy() {
    await navigator.clipboard.writeText(window.location.href);
  }

  async function handleShare() {
    if (navigator.share) {
      await navigator.share({ title, url: window.location.href });
      return;
    }

    await handleCopy();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <ActionButton label="Copy Link" onClick={handleCopy}>
        <Copy size={14} />
      </ActionButton>
      <ActionButton label="Share" onClick={handleShare}>
        <Share2 size={14} />
      </ActionButton>
      <ActionButton label="Print" onClick={handlePrint}>
        <Printer size={14} />
      </ActionButton>
    </div>
  );
}
