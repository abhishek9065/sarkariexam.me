'use client';

import Link from 'next/link';

// Mock data
const jobData = {
  title: 'RRB NTPC Recruitment 2026',
  organization: 'Railway Recruitment Board (RRB)',
  postName: 'Non Technical Popular Categories (NTPC) Various Post Recruitment 2026',
  shortInfo: 'Railway Recruitment Board (RRB) has Released the Notification for the Recruitment of Non Technical Popular Categories (NTPC). Those Candidates Are Enrolled with Vacancy Can Read the Full Notification Before Apply Online.',
  dates: {
    applyStart: '15/02/2026',
    applyEnd: '15/04/2026 up to 6 PM',
    feeLastDate: '15/04/2026',
    examDate: 'June 2026',
    admitCard: 'Before Exam',
  },
  fees: {
    generalOBC: '500/-',
    scStPh: '250/-',
    female: '250/-',
    correction: '250/-',
    refundInfo: 'After appear Stage I Exam: UR/OBC: ₹400/- & SC/ST/Female: ₹250/- Refunded',
    paymentMode: 'Pay the Examination Fee Through Debit Card, Credit Card, Net Banking, E Challan',
  },
  ageLimit: {
    min: '18 Years',
    max: '33 Years',
    asOn: '01/01/2026',
    extra: 'Age Relaxation Extra as per Railway Recruitment Board RRB NTPC Recruitment 2026 Rules.',
  },
  vacancies: [
    { code: 'A', name: 'Junior Clerk cum Typist', posts: 4300, eligibility: '10+2 Intermediate Exam in Any Recognized Board in India with 50% Marks.' },
    { code: 'B', name: 'Accounts Clerk cum Typist', posts: 760, eligibility: '10+2 Intermediate Exam with 50% Marks.' },
    { code: 'C', name: 'Junior Time Keeper', posts: 110, eligibility: '10+2 Intermediate Exam.' },
    { code: 'D', name: 'Trains Clerk', posts: 592, eligibility: '10+2 Intermediate Exam in Any Recognized Board.' },
    { code: 'E', name: 'Commercial cum Ticket Clerk', posts: 4940, eligibility: '10+2 Intermediate Exam.' },
    { code: 'F', name: 'Traffic Assistant', posts: 88, eligibility: 'Bachelor Degree in Any Stream.' },
    { code: 'G', name: 'Goods Guard', posts: 5748, eligibility: 'Bachelor Degree in Any Stream.' },
    { code: 'H', name: 'Senior Commercial cum Ticket Clerk', posts: 5638, eligibility: 'Bachelor Degree in Any Stream.' },
  ],
  links: [
    { name: 'Apply Online', url: '#' },
    { name: 'Download Notification', url: '#' },
    { name: 'Download Syllabus', url: '#' },
    { name: 'Official Website', url: 'https://indianrailways.gov.in' },
  ],
};

export default function JobDetailPage() {
  return (
    <div className="min-h-screen bg-white text-black font-sans pb-10">
      <div className="container mx-auto max-w-[1000px] border border-gray-300 mt-2 md:mt-4 bg-white shadow-sm p-1 sm:p-2">
        
        {/* Main Header Block */}
        <div className="text-center mb-4">
          <table className="w-full text-left text-sm md:text-base border-collapse border border-gray-400 mb-4">
            <tbody>
              <tr>
                <td className="border border-gray-400 p-2 font-bold w-1/4 text-[#B91C1C]">Name of Post:</td>
                <td className="border border-gray-400 p-2 font-bold">RRB NTPC Online Form 2026</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 font-bold text-[#B91C1C]">Post Date / Update:</td>
                <td className="border border-gray-400 p-2 font-bold">01 February 2026 | 11:45 AM</td>
              </tr>
              <tr>
                <td className="border border-gray-400 p-2 font-bold text-[#B91C1C]">Short Information:</td>
                <td className="border border-gray-400 p-2 text-justify">{jobData.shortInfo}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Title Logo Block */}
        <div className="text-center bg-gray-50 p-3 mb-4 rounded border border-gray-300">
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#B91C1C] mb-1">
            {jobData.organization}
          </h1>
          <h2 className="text-xl md:text-2xl font-bold text-[#1D4ED8] mb-1">
            {jobData.postName}
          </h2>
          <h3 className="text-lg md:text-xl font-bold text-green-700">
            SarkariExams.me
          </h3>
        </div>

        {/* Important Dates and Fees (2-Column Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border border-gray-400 mb-4">
          <div className="p-3 border-b md:border-b-0 md:border-r border-gray-400">
            <h3 className="text-xl font-bold text-[#1D4ED8] text-center mb-3">Important Dates</h3>
            <ul className="list-disc pl-5 space-y-1 text-[15px] font-semibold text-gray-800">
              <li>Application Begin : <span className="text-[#B91C1C]">{jobData.dates.applyStart}</span></li>
              <li>Last Date for Apply Online : <span className="text-[#B91C1C]">{jobData.dates.applyEnd}</span></li>
              <li>Pay Exam Fee Last Date : <span className="text-[#B91C1C]">{jobData.dates.feeLastDate}</span></li>
              <li>Exam Date : <span>{jobData.dates.examDate}</span></li>
              <li>Admit Card Available : <span>{jobData.dates.admitCard}</span></li>
            </ul>
          </div>
          <div className="p-3">
            <h3 className="text-xl font-bold text-[#1D4ED8] text-center mb-3">Application Fee</h3>
            <ul className="list-disc pl-5 space-y-1 text-[15px] font-semibold text-gray-800">
              <li>General / OBC / EWS : <span className="text-[#B91C1C] font-bold">{jobData.fees.generalOBC}</span></li>
              <li>SC / ST / PH : <span className="text-[#B91C1C] font-bold">{jobData.fees.scStPh}</span></li>
              <li>All Category Female : <span className="text-[#B91C1C] font-bold">{jobData.fees.female}</span></li>
              <li>After appear Stage I Exam : {jobData.fees.refundInfo}</li>
            </ul>
            <p className="mt-3 text-sm text-center font-medium text-gray-600">{jobData.fees.paymentMode}</p>
          </div>
        </div>

        {/* Age Limit */}
        <div className="border border-gray-400 p-3 mb-4">
          <h3 className="text-xl font-bold text-[#1D4ED8] text-center mb-2">Age Limit as on {jobData.ageLimit.asOn}</h3>
          <ul className="list-disc pl-5 space-y-1 text-[15px] font-semibold text-gray-800 max-w-lg mx-auto">
            <li>Minimum Age : <span className="font-bold">{jobData.ageLimit.min}</span></li>
            <li>Maximum Age : <span className="font-bold">{jobData.ageLimit.max}</span></li>
          </ul>
          <p className="text-center text-sm font-semibold text-[#B91C1C] mt-2">{jobData.ageLimit.extra}</p>
        </div>

        {/* Vacancy Details Table */}
        <div className="border border-gray-400 mb-4 overflow-x-auto">
          <div className="bg-gray-100 p-2 text-center border-b border-gray-400">
            <h3 className="text-xl font-bold text-[#1D4ED8]">Vacancy Details Total : 35000+ Posts</h3>
          </div>
          <table className="w-full text-center border-collapse text-sm md:text-[15px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-400 text-green-800">
                <th className="border-r border-gray-400 p-2 w-[15%]">Post Name</th>
                <th className="border-r border-gray-400 p-2 w-[15%]">Total Post</th>
                <th className="p-2 w-[70%]">RRB NTPC Eligibility 2026</th>
              </tr>
            </thead>
            <tbody>
              {jobData.vacancies.map((vac, i) => (
                <tr key={i} className="border-b border-gray-400 hover:bg-gray-50">
                  <td className="border-r border-gray-400 p-2 font-bold text-blue-800">{vac.name}</td>
                  <td className="border-r border-gray-400 p-2 font-semibold">{vac.posts}</td>
                  <td className="p-2 text-left font-medium">{vac.eligibility}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* How to Fill Form */}
        <div className="border border-gray-400 mb-4">
          <div className="bg-gray-100 p-2 text-center border-b border-gray-400">
            <h3 className="text-xl font-bold text-[#1D4ED8]">How to Fill RRB NTPC Online Form 2026</h3>
          </div>
          <div className="p-3 md:p-5 text-[15px] font-semibold text-gray-800 space-y-2">
            <ul className="list-disc pl-5 space-y-2">
              <li>Railway Recruitment Board (RRB) Latest Recruitment 2026 for Non Technical Popular Categories (NTPC). Candidate Can Apply Between <strong>{jobData.dates.applyStart} to {jobData.dates.applyEnd}</strong>.</li>
              <li>Candidate Read the Notification Before Apply the Recruitment Application Form in Sarkari Exams Latest Job Section.</li>
              <li>Kindly Check and Collect the All Document - Eligibility, ID Proof, Address Details, Basic Details.</li>
              <li>Kindly Ready Scan Document Related to Recruitment Form - Photo, Sign, ID Proof, Etc.</li>
              <li>Before Submit the Application Form Must Check the Preview and All Column Carefully.</li>
              <li>If Candidate Required to Paying the Application Fee Must Submit. If You have Not the Required Application Fees Your Form is Not Completed.</li>
              <li>Take A Print Out of Final Submitted Form.</li>
            </ul>
          </div>
        </div>

        {/* Important Links Table */}
        <div className="border border-gray-400 mb-8 max-w-4xl mx-auto rounded overflow-hidden">
          <div className="bg-[#1D4ED8] p-2 text-center text-white border-b border-gray-400">
            <h3 className="text-xl md:text-2xl font-extrabold uppercase tracking-wide">Some Useful Important Links</h3>
          </div>
          <table className="w-full text-center border-collapse">
            <tbody>
              <tr>
                <td className="border-b border-r border-gray-400 p-3 font-bold text-[#B91C1C] text-lg w-1/2">
                  Apply Online
                </td>
                <td className="border-b border-gray-400 p-3 font-bold text-lg w-1/2">
                  <a href="#" className="text-blue-600 hover:text-red-600 hover:underline">Click Here</a>
                </td>
              </tr>
              <tr>
                <td className="border-b border-r border-gray-400 p-3 font-bold text-[#B91C1C] text-lg">
                  Download Notification
                </td>
                <td className="border-b border-gray-400 p-3 font-bold text-lg">
                  <a href="#" className="text-blue-600 hover:text-red-600 hover:underline">Click Here</a>
                </td>
              </tr>
              <tr>
                <td className="border-b border-r border-gray-400 p-3 font-bold text-[#B91C1C] text-lg">
                  Download Syllabus
                </td>
                <td className="border-b border-gray-400 p-3 font-bold text-lg">
                  <a href="#" className="text-blue-600 hover:text-red-600 hover:underline">Click Here</a>
                </td>
              </tr>
              <tr>
                <td className="border-r border-gray-400 p-3 font-bold text-[#B91C1C] text-lg">
                  Official Website
                </td>
                <td className="border-gray-400 p-3 font-bold text-lg">
                  <a href="https://indianrailways.gov.in" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-red-600 hover:underline">Click Here</a>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}
