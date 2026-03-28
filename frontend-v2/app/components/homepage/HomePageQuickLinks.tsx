import {
  ArrowUpRight,
  Award,
  BookOpen,
  Briefcase,
  Building2,
  ClipboardCheck,
  Cpu,
  Download,
  ExternalLink,
  FileText,
  Globe,
  GraduationCap,
  Landmark,
  Scale,
  Shield,
  Stethoscope,
  Train,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { HomePageSectionBox } from './HomePageSectionBox';
import { homePageLinks, toOfficialUrl } from './links';

const quickCategories = [
  { icon: FileText, label: 'Online Form', count: '342', color: 'text-blue-600', bg: 'bg-blue-50', href: homePageLinks.jobs },
  { icon: Download, label: 'Admit Card', count: '128', color: 'text-purple-600', bg: 'bg-purple-50', href: homePageLinks.admitCards },
  { icon: ClipboardCheck, label: 'Result', count: '89', color: 'text-green-600', bg: 'bg-green-50', href: homePageLinks.results },
  { icon: BookOpen, label: 'Answer Key', count: '56', color: 'text-teal-600', bg: 'bg-teal-50', href: homePageLinks.answerKey },
  { icon: Award, label: 'Syllabus', count: '200+', color: 'text-amber-600', bg: 'bg-amber-50', href: homePageLinks.syllabus },
  { icon: GraduationCap, label: 'Admission', count: '95', color: 'text-rose-600', bg: 'bg-rose-50', href: homePageLinks.admissions },
] as const;

const departmentJobs = [
  { icon: Briefcase, label: 'Central Govt Jobs', count: '2,340' },
  { icon: Landmark, label: 'State Govt Jobs', count: '1,890' },
  { icon: Shield, label: 'Defence Jobs', count: '890' },
  { icon: Train, label: 'Railway Jobs', count: '1,200' },
  { icon: Building2, label: 'Bank Jobs', count: '760' },
  { icon: Stethoscope, label: 'Medical Jobs', count: '430' },
  { icon: GraduationCap, label: 'Teaching Jobs', count: '980' },
  { icon: Scale, label: 'Judiciary Jobs', count: '320' },
  { icon: Cpu, label: 'IT / Tech Jobs', count: '540' },
  { icon: Users, label: 'PSC Jobs', count: '1,100' },
] as const;

const importantWebsites = [
  { label: 'UPSC', url: 'upsc.gov.in' },
  { label: 'SSC', url: 'ssc.nic.in' },
  { label: 'IBPS', url: 'ibps.in' },
  { label: 'RRB', url: 'indianrailways.gov.in' },
  { label: 'NTA', url: 'nta.ac.in' },
  { label: 'CBSE', url: 'cbse.gov.in' },
  { label: 'BPSC', url: 'bpsc.bih.nic.in' },
  { label: 'UPPSC', url: 'uppsc.up.nic.in' },
] as const;

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

export function HomePageQuickLinks() {
  return (
    <section id="quick-links" className="py-4">
      <div className="mx-auto max-w-6xl px-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <HomePageSectionBox title="Quick Links" headerColor="bg-[#e65100]" viewAllLink={homePageLinks.quickLinks}>
              <div className="space-y-1.5 p-3">
                {quickCategories.map((category) => (
                  <Link
                    key={category.label}
                    href={category.href}
                    className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-gray-50"
                  >
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${category.bg}`}>
                      <category.icon size={16} className={category.color} />
                    </div>
                    <span className="flex-1 text-[13px] font-semibold text-gray-700 transition-colors group-hover:text-[#e65100]">
                      {category.label}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
                      {category.count}
                    </span>
                  </Link>
                ))}
              </div>
            </HomePageSectionBox>

            <div className="mt-4">
              <HomePageSectionBox title="Important Websites" headerColor="bg-[#37474f]" viewAllLink={homePageLinks.importantLinks}>
                <div className="space-y-1 p-3">
                  {importantWebsites.map((website) => (
                    <a
                      key={website.label}
                      href={toOfficialUrl(website.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="group flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-2">
                        <Globe size={13} className="text-gray-400" />
                        <span className="text-[12px] font-semibold text-gray-700 transition-colors group-hover:text-blue-700">
                          {website.label}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        {website.url}
                        <ExternalLink size={10} />
                      </span>
                    </a>
                  ))}
                </div>
              </HomePageSectionBox>
            </div>
          </div>

          <div className="lg:col-span-2">
            <HomePageSectionBox title="Jobs by Department" headerColor="bg-[#283593]" viewAllLink={homePageLinks.jobs}>
              <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-2">
                {departmentJobs.map((department) => (
                  <Link
                    key={department.label}
                    href={homePageLinks.jobs}
                    className="group flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-3 transition-all hover:border-orange-200 hover:bg-orange-50/50 hover:shadow-sm"
                  >
                    <department.icon size={18} className="shrink-0 text-gray-500 transition-colors group-hover:text-[#e65100]" />
                    <div className="flex-1">
                      <span className="text-[13px] font-semibold text-gray-800 transition-colors group-hover:text-[#e65100]">
                        {department.label}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[14px] font-bold text-[#e65100]">{department.count}</span>
                      <div className="text-[9px] text-gray-400">Vacancies</div>
                    </div>
                    <ArrowUpRight size={14} className="shrink-0 text-gray-300 transition-colors group-hover:text-[#e65100]" />
                  </Link>
                ))}
              </div>
            </HomePageSectionBox>

            <div className="mt-4">
              <HomePageSectionBox id="state-jobs" title="State Wise Jobs" headerColor="bg-[#4e342e]" viewAllLink={homePageLinks.states}>
                <div className="grid grid-cols-2 gap-1.5 p-3 sm:grid-cols-3 md:grid-cols-4">
                  {states.map((state) => (
                    <Link
                      key={state}
                      href={`/states/${toStateSlug(state)}`}
                      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[12px] font-medium text-gray-600 transition-colors hover:bg-orange-50 hover:text-[#e65100]"
                    >
                      <span className="h-1 w-1 shrink-0 rounded-full bg-orange-300" />
                      {state}
                    </Link>
                  ))}
                </div>
              </HomePageSectionBox>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
