interface DetailKeyValueRow {
  label: string;
  value: string;
}

export function DetailKeyValueGrid({ rows }: { rows: DetailKeyValueRow[] }) {
  return (
    <div className="divide-y divide-gray-100">
      {rows.map((row) => (
        <div key={`${row.label}-${row.value}`} className="grid gap-3 px-5 py-3 md:grid-cols-[220px_1fr]">
          <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#b91c1c]">
            {row.label}
          </div>
          <div className="text-sm leading-7 text-gray-700">{row.value}</div>
        </div>
      ))}
    </div>
  );
}
