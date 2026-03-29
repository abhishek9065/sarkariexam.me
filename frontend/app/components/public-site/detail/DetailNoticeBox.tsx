import type { DetailNotice } from '@/app/lib/public-content';

const toneClasses = {
  info: 'border-blue-200 bg-blue-50/70 text-blue-900',
  success: 'border-green-200 bg-green-50/80 text-green-900',
  warning: 'border-amber-200 bg-amber-50/90 text-amber-900',
} as const;

export function DetailNoticeBox({ notice }: { notice: DetailNotice }) {
  return (
    <div className={`rounded-2xl border px-5 py-4 ${toneClasses[notice.tone]}`}>
      <h3 className="text-[13px] font-extrabold uppercase tracking-[0.12em]">{notice.title}</h3>
      <div className="mt-2 space-y-2 text-sm leading-7">
        {notice.body.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}
