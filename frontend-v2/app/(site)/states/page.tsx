import Link from 'next/link';

const states = [
  'Uttar Pradesh',
  'Bihar',
  'Rajasthan',
  'Madhya Pradesh',
  'Maharashtra',
  'Delhi',
  'Gujarat',
  'Tamil Nadu',
  'Karnataka',
  'West Bengal',
  'Punjab',
  'Haryana',
  'Jharkhand',
  'Chhattisgarh',
  'Odisha',
  'Uttarakhand',
];

function toStateSlug(label: string) {
  return label.toLowerCase().replace(/\s+/g, '-');
}

export default function StatesPage() {
  return (
    <div className="min-h-screen bg-[#f0f2f7]">
      <section className="rounded-2xl bg-[#4e342e] px-6 py-8 text-white shadow-sm">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">State Directory</p>
        <h1 className="text-3xl font-extrabold">State Wise Jobs</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-white/85">
          Browse state-specific government job notices, exam forms, results, and recruitment updates.
        </p>
      </section>

      <section className="mt-5 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="bg-[#283593] px-4 py-3 text-sm font-bold uppercase tracking-[0.16em] text-white">
          States Covered
        </div>
        <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-4">
          {states.map((state) => (
            <Link
              key={state}
              href={`/states/${toStateSlug(state)}`}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 transition-colors hover:border-orange-200 hover:bg-orange-50 hover:text-[#e65100]"
            >
              {state}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
