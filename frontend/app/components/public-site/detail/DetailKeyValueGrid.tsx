interface DetailKeyValueRow {
  label: string;
  value: string;
}

export function DetailKeyValueGrid({ rows }: { rows: DetailKeyValueRow[] }) {
  return (
    <div className="divide-y divide-[#e7e7e7]">
      {rows.map((row) => (
        <div
          key={`${row.label}-${row.value}`}
          className="grid gap-2 px-4 py-3 sm:px-5 md:grid-cols-[220px_1fr]"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#b45309]">
            {row.label}
          </div>
          <div className="text-sm leading-7 text-[#374151]">{row.value}</div>
        </div>
      ))}
    </div>
  );
}
