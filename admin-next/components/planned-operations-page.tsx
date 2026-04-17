import Link from 'next/link';
import { ArrowRight, Clock3, ShieldAlert } from 'lucide-react';

type PlannedAction = {
  href: string;
  label: string;
  description: string;
};

type PlannedOperationsPageProps = {
  title: string;
  description: string;
  actions: PlannedAction[];
};

export function PlannedOperationsPage({ title, description, actions }: PlannedOperationsPageProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-[28px] border border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 p-6 shadow-sm">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100">
          <ShieldAlert className="h-5 w-5 text-amber-700" />
        </div>
        <div className="min-w-0">
          <h2 className="text-[20px] font-extrabold text-gray-900">{title}</h2>
          <p className="mt-2 max-w-3xl text-[13px] leading-6 text-gray-700">{description}</p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-amber-700">
            <Clock3 className="h-3.5 w-3.5" />
            Quarantined until the workflow is API-backed
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {actions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="group rounded-[24px] border border-gray-100 bg-white p-5 shadow-sm transition-colors hover:border-orange-200 hover:bg-orange-50/40"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">{action.label}</h3>
                <p className="mt-1 text-[12px] leading-5 text-gray-600">{action.description}</p>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-orange-600" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
