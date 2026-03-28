import Link from 'next/link';

function toTitle(value: string) {
  return value
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resultTitle = toTitle(id);

  return (
    <div className="min-h-screen bg-[#f0f2f7]">
      <div className="rounded-2xl border border-gray-200 bg-white p-1 shadow-sm">
        <div className="overflow-hidden rounded-xl border border-gray-300">
          <div className="bg-[#1565c0] px-4 py-3 text-center text-white">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/75">Result Detail</p>
            <h1 className="mt-1 text-2xl font-extrabold">{resultTitle} Result Details</h1>
          </div>

          <table className="w-full border-collapse text-sm">
            <tbody>
              <tr>
                <td className="border border-gray-300 p-3 font-bold text-[#B91C1C]">Post Date / Update</td>
                <td className="border border-gray-300 p-3 font-semibold text-gray-800">28 March 2026 | 10:20 AM</td>
              </tr>
              <tr>
                <td className="border border-gray-300 p-3 font-bold text-[#B91C1C]">Short Information</td>
                <td className="border border-gray-300 p-3 text-gray-700">
                  Detailed result page placeholder for {resultTitle}. This route is active so result cards no longer break.
                </td>
              </tr>
            </tbody>
          </table>

          <div className="grid gap-0 border-t border-gray-300 md:grid-cols-2">
            <div className="border-b border-gray-300 p-4 md:border-b-0 md:border-r">
              <h2 className="mb-3 text-center text-xl font-bold text-[#1565c0]">Important Dates</h2>
              <ul className="list-disc space-y-1 pl-5 text-[15px] font-semibold text-gray-800">
                <li>Exam Conducted : January 2026</li>
                <li>Result Declared : March 2026</li>
                <li>Score Card Available : With Result</li>
                <li>Merit List / Cutoff : Included</li>
              </ul>
            </div>
            <div className="p-4">
              <h2 className="mb-3 text-center text-xl font-bold text-[#1565c0]">Useful Links</h2>
              <div className="space-y-2 text-center">
                <Link href="/results" className="block rounded-lg border border-gray-200 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50">
                  Back to Results
                </Link>
                <a href="#" className="block rounded-lg border border-gray-200 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-50">
                  Download Score Card
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
