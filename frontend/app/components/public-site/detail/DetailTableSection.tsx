import type { DetailVacancyTable } from '@/app/lib/public-content';

export function DetailTableSection({ table }: { table: DetailVacancyTable }) {
  return (
    <div className="overflow-x-auto px-4 py-4 sm:px-5">
      <table className="min-w-full border-collapse overflow-hidden rounded-xl border border-[#ead7ca] text-sm">
        <thead>
          <tr className="bg-[#fff2e8] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[#9a3412]">
            {table.columns.map((column) => (
              <th key={column} className="border border-[#ead7ca] px-3 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, index) => (
            <tr
              key={`${row.post}-${row.department}`}
              className={`align-top ${index % 2 === 0 ? 'bg-white' : 'bg-[#fffdfb]'}`}
            >
              <td className="border border-[#ece5df] px-3 py-3 font-semibold text-[#1f2937]">
                {row.post}
              </td>
              <td className="border border-[#ece5df] px-3 py-3 text-[#4b5563]">{row.department}</td>
              <td className="border border-[#ece5df] px-3 py-3 font-semibold text-[#4b5563]">
                {row.vacancies}
              </td>
              <td className="border border-[#ece5df] px-3 py-3 text-[#4b5563]">{row.payLevel ?? '-'}</td>
              <td className="border border-[#ece5df] px-3 py-3 text-[#4b5563]">{row.salary ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
