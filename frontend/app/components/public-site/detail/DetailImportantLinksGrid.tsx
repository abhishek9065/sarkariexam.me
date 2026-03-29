import Link from 'next/link';
import type { DetailImportantLink } from '@/app/lib/public-content';

const emphasisClasses = {
  primary:
    'border-[#e65100] bg-[linear-gradient(135deg,#e65100,#bf360c)] text-white hover:opacity-95',
  secondary:
    'border-orange-200 bg-orange-50 text-[#bf360c] hover:border-orange-300 hover:bg-orange-100',
  muted:
    'border-gray-200 bg-white text-gray-700 hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]',
} as const;

export function DetailImportantLinksGrid({
  links,
}: {
  links: DetailImportantLink[];
}) {
  return (
    <div className="grid gap-3 p-4 sm:p-5 md:grid-cols-2">
      {links.map((link) => {
        const emphasis = link.emphasis ?? 'muted';

        return (
          <Link
            key={`${link.label}-${link.href}`}
            href={link.href}
            className={`rounded-[16px] border px-4 py-3 transition-colors ${emphasisClasses[emphasis]}`}
          >
            <div className="text-sm font-bold">{link.label}</div>
            {link.note ? <div className="mt-1 text-[11px] opacity-80">{link.note}</div> : null}
          </Link>
        );
      })}
    </div>
  );
}
