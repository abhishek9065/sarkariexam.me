import type { DetailNotice } from '@/app/lib/public-content';

const toneClasses = {
  info: 'border-blue-200 bg-blue-50/70 text-blue-900',
  success: 'border-green-200 bg-green-50/80 text-green-900',
  warning: 'border-amber-200 bg-amber-50/90 text-amber-900',
} as const;

export function DetailNoticeBox({ notice }: { notice: DetailNotice }) {
  return (
    <div className={`overflow-hidden rounded-[18px] border shadow-sm ${toneClasses[notice.tone]}`}>
      <div className="border-b border-current/10 px-4 py-3">
        <h3 className="text-[12px] font-extrabold uppercase tracking-[0.14em]">{notice.title}</h3>
      </div>
      <div className="space-y-2 px-4 py-4 text-sm leading-7 sm:px-5">
        {notice.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
