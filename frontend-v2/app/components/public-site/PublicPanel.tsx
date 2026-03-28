import type { ReactNode } from 'react';

interface PublicPanelProps {
  children: ReactNode;
  headerColor: string;
  title: string;
}

export function PublicPanel({ children, headerColor, title }: PublicPanelProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className={`${headerColor} px-4 py-2.5`}>
        <h2 className="flex items-center gap-2 text-white">
          <span className="h-4 w-1 rounded-full bg-white/50" />
          <span className="text-[12px] font-bold uppercase tracking-wide">{title}</span>
        </h2>
      </div>
      <div>{children}</div>
    </div>
  );
}
