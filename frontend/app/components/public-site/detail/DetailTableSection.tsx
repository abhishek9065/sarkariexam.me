import type { DetailVacancyTable } from '@/app/lib/public-content';

export function DetailTableSection({ table }: { table: DetailVacancyTable }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-sm">
        <thead>
          <tr className="bg-[#fff3eb] text-left text-[11px] font-bold uppercase tracking-[0.14em] text-[#bf360c]">
            {table.columns.map((column) => (
              <th key={column} className="border-b border-orange-100 px-4 py-3">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row) => (
            <tr key={`${row.post}-${row.department}`} className="border-b border-gray-100 align-top last:border-b-0">
              <td className="px-4 py-3 font-semibold text-gray-800">{row.post}</td>
              <td className="px-4 py-3 text-gray-700">{row.department}</td>
              <td className="px-4 py-3 text-gray-700">{row.vacancies}</td>
              <td className="px-4 py-3 text-gray-700">{row.payLevel ?? '-'}</td>
              <td className="px-4 py-3 text-gray-700">{row.salary ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
