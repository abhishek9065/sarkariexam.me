import type { ReactNode } from 'react';

export function DetailSidebarCard({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <aside className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-orange-100 bg-[linear-gradient(90deg,#fff8f5_0%,#ffffff_100%)] px-4 py-3">
        <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-gray-800">{title}</h3>
      </div>
      <div>{children}</div>
    </aside>
  );
}
