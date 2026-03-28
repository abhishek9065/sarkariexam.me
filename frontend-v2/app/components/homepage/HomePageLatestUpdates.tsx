import { ExternalLink, Globe } from 'lucide-react';
import { HomePageLinkItem, HomePageSectionBox } from './HomePageSectionBox';
import { homePageLinks, toOfficialUrl } from './links';

const importantLinks = [
  { label: 'UPSC Official Website', url: 'upsc.gov.in', tag: 'Central' },
  { label: 'SSC Official Portal', url: 'ssc.nic.in', tag: 'Central' },
  { label: 'IBPS Online', url: 'ibps.in', tag: 'Banking' },
  { label: 'Indian Railways RRB', url: 'indianrailways.gov.in', tag: 'Railway' },
  { label: 'NTA Exam Portal', url: 'nta.ac.in', tag: 'Exam' },
  { label: 'CBSE Board', url: 'cbse.gov.in', tag: 'Board' },
  { label: 'BPSC Bihar', url: 'bpsc.bih.nic.in', tag: 'State' },
  { label: 'UPPSC Uttar Pradesh', url: 'uppsc.up.nic.in', tag: 'State' },
  { label: 'RPSC Rajasthan', url: 'rpsc.rajasthan.gov.in', tag: 'State' },
  { label: 'MPSC Maharashtra', url: 'mpsc.gov.in', tag: 'State' },
  { label: 'KPSC Karnataka', url: 'kpsc.kar.nic.in', tag: 'State' },
  { label: 'Results.nic.in', url: 'results.nic.in', tag: 'Result' },
] as const;

const tagColor: Record<(typeof importantLinks)[number]['tag'], string> = {
  Central: 'bg-blue-100 text-blue-700',
  Banking: 'bg-green-100 text-green-700',
  Railway: 'bg-orange-100 text-orange-700',
  Exam: 'bg-purple-100 text-purple-700',
  Board: 'bg-teal-100 text-teal-700',
  State: 'bg-amber-100 text-amber-700',
  Result: 'bg-red-100 text-red-700',
};

export function HomePageLatestUpdates() {
  return (
    <section className="py-4">
      <div className="mx-auto max-w-6xl px-3">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <HomePageSectionBox id="latest-results" title="Latest Result" headerColor="bg-[#1565c0]" viewAllLink={homePageLinks.results}>
            <HomePageLinkItem href={homePageLinks.results} title="UPSC Civil Services 2025 — Final Result" org="UPSC" date="27 Mar 2026" tag="hot" postCount="933" />
            <HomePageLinkItem href={homePageLinks.results} title="SSC CHSL 2025 — Tier 2 Result" org="SSC" date="26 Mar 2026" tag="new" postCount="6,500" />
            <HomePageLinkItem href={homePageLinks.results} title="IBPS Clerk Mains 2025 — Result Declared" org="IBPS" date="25 Mar 2026" tag="new" postCount="5,000" />
            <HomePageLinkItem href={homePageLinks.results} title="RRB NTPC CBT 2 Result 2025" org="RRB" date="24 Mar 2026" postCount="35,208" />
            <HomePageLinkItem href={homePageLinks.results} title="NTA CUET UG 2026 — Score Card Released" org="NTA" date="23 Mar 2026" tag="new" />
            <HomePageLinkItem href={homePageLinks.results} title="CTET December 2025 Result" org="CBSE" date="22 Mar 2026" />
            <HomePageLinkItem href={homePageLinks.results} title="Bihar BPSC 69th CCE — Final Result" org="BPSC" date="21 Mar 2026" tag="hot" postCount="553" />
            <HomePageLinkItem href={homePageLinks.results} title="SSC MTS 2025 — Tier 1 Result" org="SSC" date="20 Mar 2026" postCount="9,500" />
            <HomePageLinkItem href={homePageLinks.results} title="Rajasthan Police Constable Result 2025" org="RPSC" date="19 Mar 2026" tag="update" postCount="4,438" />
            <HomePageLinkItem href={homePageLinks.results} title="NDA 2025 (II) — Written Exam Result" org="UPSC" date="18 Mar 2026" postCount="400" />
            <HomePageLinkItem href={homePageLinks.results} title="UP TGT/PGT 2025 — Final Merit List" org="UPSESSB" date="17 Mar 2026" postCount="3,539" />
            <HomePageLinkItem href={homePageLinks.results} title="RBI Grade B 2025 — Phase II Result" org="RBI" date="16 Mar 2026" tag="new" postCount="143" />
          </HomePageSectionBox>

          <HomePageSectionBox id="latest-admit-cards" title="Latest Admit Card" headerColor="bg-[#6a1b9a]" viewAllLink={homePageLinks.admitCards}>
            <HomePageLinkItem href={homePageLinks.admitCards} title="SSC GD Constable 2026 — PET/PST Admit Card" org="SSC" date="28 Mar 2026" tag="hot" postCount="46,617" />
            <HomePageLinkItem href={homePageLinks.admitCards} title="UPSC EPFO 2026 Admit Card" org="UPSC" date="27 Mar 2026" tag="new" postCount="577" />
            <HomePageLinkItem href={homePageLinks.admitCards} title="NTA CUET UG 2026 — City Slip Released" org="NTA" date="26 Mar 2026" tag="new" />
            <HomePageLinkItem href={homePageLinks.admitCards} title="Bihar STET 2026 Admit Card" org="BSEB" date="25 Mar 2026" postCount="7,500" />
            <HomePageLinkItem href={homePageLinks.admitCards} title="SSC CGL 2026 — Tier 1 Admit Card" org="SSC" date="24 Mar 2026" tag="new" postCount="14,582" />
            <HomePageLinkItem href={homePageLinks.admitCards} title="IBPS PO Prelims 2026 — Call Letter" org="IBPS" date="23 Mar 2026" postCount="4,500" />
            <HomePageLinkItem href={homePageLinks.admitCards} title="Railway Group D CBT Admit Card 2026" org="RRB" date="22 Mar 2026" postCount="32,000" />
            <HomePageLinkItem href={homePageLinks.admitCards} title="UPSC CSE Prelims 2026 — e-Admit Card" org="UPSC" date="21 Mar 2026" tag="hot" />
            <HomePageLinkItem href={homePageLinks.admitCards} title="NDA 2026 — Exam Admit Card Released" org="UPSC" date="20 Mar 2026" postCount="400" />
            <HomePageLinkItem href={homePageLinks.admitCards} title="Delhi Police Head Constable Admit Card" org="SSC" date="19 Mar 2026" tag="new" postCount="835" />
          </HomePageSectionBox>

          <HomePageSectionBox id="latest-jobs" title="Latest Jobs / Online Form" headerColor="bg-[#d32f2f]" viewAllLink={homePageLinks.jobs}>
            <HomePageLinkItem href={homePageLinks.jobs} title="SSC CGL 2026 — Combined Graduate Level Exam" org="Staff Selection Commission" date="28 Mar 2026" tag="hot" postCount="14,582" qualification="Graduate" />
            <HomePageLinkItem href={homePageLinks.jobs} title="IBPS PO 2026 — Probationary Officer" org="IBPS" date="26 Mar 2026" tag="new" postCount="4,500" qualification="Graduate" />
            <HomePageLinkItem href={homePageLinks.jobs} title="Railway RRB Group D — Level 1 Posts" org="Railway Recruitment Board" date="25 Mar 2026" tag="new" postCount="32,000" qualification="10th Pass" />
            <HomePageLinkItem href={homePageLinks.jobs} title="UPSC NDA/NA 2026 — National Defence Academy" org="UPSC" date="24 Mar 2026" tag="last-date" postCount="400" qualification="12th Pass" />
            <HomePageLinkItem href={homePageLinks.jobs} title="Bihar Police Constable Recruitment 2026" org="CSBC Bihar" date="22 Mar 2026" tag="new" postCount="21,391" qualification="12th Pass" />
            <HomePageLinkItem href={homePageLinks.jobs} title="UPPSC PCS 2026 — Provincial Civil Service" org="UPPSC" date="21 Mar 2026" postCount="250" qualification="Graduate" />
            <HomePageLinkItem href={homePageLinks.jobs} title="DSSSB TGT/PGT Teacher Recruitment 2026" org="DSSSB Delhi" date="20 Mar 2026" tag="new" postCount="5,118" qualification="B.Ed" />
            <HomePageLinkItem href={homePageLinks.jobs} title="Indian Navy SSR/AA Recruitment 2026" org="Indian Navy" date="19 Mar 2026" postCount="2,500" qualification="12th Pass" />
            <HomePageLinkItem href={homePageLinks.jobs} title="SBI Clerk 2026 — Junior Associate" org="State Bank of India" date="18 Mar 2026" tag="hot" postCount="8,773" qualification="Graduate" />
            <HomePageLinkItem href={homePageLinks.jobs} title="CTET 2026 — Central Teacher Eligibility Test" org="CBSE" date="17 Mar 2026" tag="new" postCount="N/A" qualification="B.Ed" />
            <HomePageLinkItem href={homePageLinks.jobs} title="MP Police Constable Recruitment 2026" org="MPESB" date="16 Mar 2026" postCount="7,090" qualification="12th Pass" />
            <HomePageLinkItem href={homePageLinks.jobs} title="UPSC CAPF 2026 — Asst Commandant" org="UPSC" date="15 Mar 2026" postCount="322" qualification="Graduate" />
          </HomePageSectionBox>

          <HomePageSectionBox id="answer-key" title="Answer Key" headerColor="bg-[#00695c]" viewAllLink={homePageLinks.answerKey}>
            <HomePageLinkItem href={homePageLinks.answerKey} title="SSC CGL 2025 Tier 1 — Answer Key Released" org="SSC" date="27 Mar 2026" tag="hot" postCount="14,000" />
            <HomePageLinkItem href={homePageLinks.answerKey} title="UPSC CAPF 2025 — Answer Key" org="UPSC" date="25 Mar 2026" tag="new" postCount="322" />
            <HomePageLinkItem href={homePageLinks.answerKey} title="NTA UGC NET Dec 2025 — Answer Key" org="NTA" date="24 Mar 2026" tag="new" />
            <HomePageLinkItem href={homePageLinks.answerKey} title="CTET 2025 (Dec) — Answer Key Available" org="CBSE" date="23 Mar 2026" />
            <HomePageLinkItem href={homePageLinks.answerKey} title="RRB NTPC CBT 2 — Answer Key" org="RRB" date="22 Mar 2026" postCount="35,208" />
            <HomePageLinkItem href={homePageLinks.answerKey} title="SSC CHSL 2025 Tier 2 — Answer Key" org="SSC" date="21 Mar 2026" tag="update" postCount="6,500" />
            <HomePageLinkItem href={homePageLinks.answerKey} title="Bihar BPSC 70th Prelims — Answer Key" org="BPSC" date="20 Mar 2026" tag="new" />
            <HomePageLinkItem href={homePageLinks.answerKey} title="UPSC NDA 2025 (II) — Answer Key" org="UPSC" date="19 Mar 2026" postCount="400" />
            <HomePageLinkItem href={homePageLinks.answerKey} title="SSC MTS 2025 Tier 1 — Answer Key" org="SSC" date="18 Mar 2026" postCount="9,500" />
            <HomePageLinkItem href={homePageLinks.answerKey} title="IBPS Clerk Prelims 2025 — Answer Key" org="IBPS" date="17 Mar 2026" tag="new" postCount="5,000" />
          </HomePageSectionBox>

          <HomePageSectionBox id="important-links" title="Important Links" headerColor="bg-[#37474f]" viewAllLink={homePageLinks.importantLinks}>
            {importantLinks.map((link) => (
              <a
                key={link.label}
                href={toOfficialUrl(link.url)}
                target="_blank"
                rel="noreferrer"
                className="group flex cursor-pointer items-center justify-between px-4 py-2.5 transition-colors hover:bg-blue-50/60"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <Globe size={12} className="shrink-0 text-gray-400 transition-colors group-hover:text-blue-600" />
                  <span className="truncate text-[12px] font-semibold text-gray-800 transition-colors group-hover:text-blue-700">
                    {link.label}
                  </span>
                </div>
                <div className="ml-2 flex shrink-0 items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${tagColor[link.tag]}`}>{link.tag}</span>
                  <ExternalLink size={10} className="text-gray-300 transition-colors group-hover:text-blue-500" />
                </div>
              </a>
            ))}
          </HomePageSectionBox>

          <HomePageSectionBox id="latest-admission" title="Latest Admission" headerColor="bg-[#ad1457]" viewAllLink={homePageLinks.admissions}>
            <HomePageLinkItem href={homePageLinks.admissions} title="DU Undergraduate Admission 2026 — CUET Based" org="Delhi University" date="28 Mar 2026" tag="new" />
            <HomePageLinkItem href={homePageLinks.admissions} title="JEE Advanced 2026 — Registration Open" org="IIT Kanpur" date="27 Mar 2026" tag="hot" />
            <HomePageLinkItem href={homePageLinks.admissions} title="NEET UG 2026 — Application Form Out" org="NTA" date="26 Mar 2026" tag="new" />
            <HomePageLinkItem href={homePageLinks.admissions} title="IIM CAT 2026 — Admission Process Begins" org="IIMs" date="25 Mar 2026" tag="hot" />
            <HomePageLinkItem href={homePageLinks.admissions} title="IGNOU July 2026 Admission Open" org="IGNOU" date="24 Mar 2026" tag="new" />
            <HomePageLinkItem href={homePageLinks.admissions} title="BHU UET 2026 — Online Registration" org="Banaras Hindu University" date="23 Mar 2026" />
            <HomePageLinkItem href={homePageLinks.admissions} title="AMU Admission 2026 — All Courses" org="Aligarh Muslim University" date="22 Mar 2026" tag="new" />
            <HomePageLinkItem href={homePageLinks.admissions} title="CLAT 2026 — Law Entrance Registration" org="Consortium of NLUs" date="21 Mar 2026" />
            <HomePageLinkItem href={homePageLinks.admissions} title="NIFT 2026 Admission — Design Programmes" org="NIFT" date="20 Mar 2026" tag="update" />
            <HomePageLinkItem href={homePageLinks.admissions} title="NDA 2026 (II) — Admission Form Released" org="UPSC" date="19 Mar 2026" tag="new" postCount="400" qualification="12th Pass" />
          </HomePageSectionBox>
        </div>
      </div>
    </section>
  );
}
