import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchAnnouncement } from '@/lib/api';
import { formatDate, typeToLabel, typeToPath, typeToBgColor } from '@/lib/utils';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ type: string; slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  try {
    const ann = await fetchAnnouncement(slug);
    return {
      title: ann.title,
      description: ann.description ?? `Details for ${ann.title}`,
    };
  } catch {
    return { title: 'Announcement' };
  }
}

export default async function DetailPage({ params }: Props) {
  const { type: typeSegment, slug } = await params;

  let announcement;
  try {
    announcement = await fetchAnnouncement(slug);
  } catch {
    notFound();
  }

  const label = typeToLabel(announcement.type);
  const listingPath = typeToPath(announcement.type);
  const bg = typeToBgColor(announcement.type);

  // Social Share URLs
  const currentUrl = `https://sarkariexams.me/${typeSegment}/${slug}`;
  const shareText = `*Job Alert:* ${announcement.title} is out! Check details here:`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + currentUrl)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(currentUrl)}&text=${encodeURIComponent(shareText)}`;

  return (
    <div className="min-h-screen bg-[#F0F0F0] dark:bg-[#0F172A] py-6 font-sans">
      <div className="container mx-auto px-2 sm:px-4 max-w-[1000px]">
        
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4 bg-white dark:bg-[#1E293B] p-3 rounded shadow border border-gray-300 dark:border-gray-700">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline">Home</Link>
          <span className="opacity-50">›</span>
          <Link href={listingPath} className="text-blue-600 dark:text-blue-400 hover:underline">{label}</Link>
          <span className="opacity-50">›</span>
          <span className="truncate max-w-[200px] sm:max-w-[400px] text-gray-800 dark:text-gray-200">
            {announcement.title}
          </span>
        </nav>

        {/* Main Content Box */}
        <div className="bg-white dark:bg-[#1E293B] rounded shadow border border-gray-300 dark:border-gray-700 overflow-hidden mb-6">
          
          {/* Header Title */}
          <div className="text-center p-4 border-b border-gray-300 dark:border-gray-700">
            <h1 className="text-2xl md:text-3xl font-black text-[#B91C1C] dark:text-red-500 mb-2 leading-tight">
              {announcement.title}
            </h1>
            <p className="text-md font-bold text-gray-700 dark:text-gray-300">
              {announcement.organization || 'Various Departments'}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-400">
              <span className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded border border-gray-200 dark:border-gray-700">
                Posted: <span className="text-[#047857] dark:text-emerald-400">{formatDate(announcement.postedAt || new Date().toISOString())}</span>
              </span>
            </div>
          </div>

          {/* Social Share & Join Banner */}
          <div className="bg-[#FFF9C4] dark:bg-[#422006] p-3 text-center border-b border-[#FDE047] dark:border-[#713F12]">
            <p className="font-bold text-[#B45309] dark:text-[#FDE047] mb-2 text-sm sm:text-base">
              Share this update with your friends!
            </p>
            <div className="flex justify-center gap-3">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="bg-[#25D366] hover:bg-[#1da851] text-white font-bold py-1.5 px-4 rounded text-sm flex items-center gap-2 shadow-sm transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.305-.888-.653-1.488-1.46-1.662-1.758-.173-.298-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                WhatsApp
              </a>
              <a href={telegramUrl} target="_blank" rel="noopener noreferrer" className="bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold py-1.5 px-4 rounded text-sm flex items-center gap-2 shadow-sm transition-colors">
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>
                Telegram
              </a>
            </div>
          </div>

          <div className="p-4 sm:p-6">
            
            {/* Classic Title Block */}
            <div className="text-center mb-6">
              <span className="inline-block bg-[#1D4ED8] dark:bg-blue-600 text-white font-bold px-4 py-1 text-sm uppercase tracking-widest border-2 border-[#1E3A8A] mb-3">
                Short Details of Notification
              </span>
            </div>

            {/* Grid for Dates and Fees (Classic Side-by-Side) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
              
              {/* Important Dates */}
              <div className="border border-gray-300 dark:border-gray-700">
                <div className="bg-[#B91C1C] text-white font-bold text-center py-2 text-sm sm:text-base border-b border-gray-300 dark:border-gray-700">
                  Important Dates
                </div>
                <div className="p-3 text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                  <ul className="list-disc pl-5 space-y-1">
                    {announcement.importantDates && Object.entries(announcement.importantDates).length > 0 ? (
                      Object.entries(announcement.importantDates).map(([key, val]) => (
                        <li key={key}>
                          <span className="text-[#B91C1C] dark:text-red-400">{key}:</span> {val}
                        </li>
                      ))
                    ) : (
                      <>
                        <li><span className="text-[#B91C1C] dark:text-red-400">Application Begin :</span> {formatDate(announcement.postedAt || new Date().toISOString())}</li>
                        <li><span className="text-[#B91C1C] dark:text-red-400">Last Date for Apply Online :</span> {announcement.deadline ? formatDate(announcement.deadline) : 'Not Notified'}</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>

              {/* Application Fee */}
              <div className="border border-gray-300 dark:border-gray-700">
                <div className="bg-[#B91C1C] text-white font-bold text-center py-2 text-sm sm:text-base border-b border-gray-300 dark:border-gray-700">
                  Application Fee
                </div>
                <div className="p-3 text-sm font-semibold text-gray-800 dark:text-gray-200 leading-relaxed">
                  <ul className="list-disc pl-5 space-y-1">
                    {announcement.applicationFee ? (
                       <li>{announcement.applicationFee}</li>
                    ) : (
                      <>
                        <li>General / OBC / EWS : <span className="text-[#B91C1C] dark:text-red-400">₹0/-</span></li>
                        <li>SC / ST : <span className="text-[#B91C1C] dark:text-red-400">₹0/-</span></li>
                        <li><span className="italic text-gray-500">Pay the Examination Fee Through Debit Card, Credit Card, Net Banking.</span></li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </div>

            {/* Age Limit & Key Info Section */}
            {(announcement.ageLimit || announcement.totalVacancy || announcement.minQualification || announcement.salary) && (
              <div className="border border-gray-300 dark:border-gray-700 mb-8">
                <div className="bg-[#047857] text-white font-bold text-center py-2 text-sm sm:text-base border-b border-gray-300 dark:border-gray-700">
                  Vacancy Details
                </div>
                <div className="p-4 text-center">
                  {announcement.ageLimit && (
                    <p className="text-sm font-bold mb-2">
                      <span className="text-[#B91C1C] dark:text-red-400">Age Limit:</span> {announcement.ageLimit}
                    </p>
                  )}
                  {announcement.salary && (
                    <p className="text-sm font-bold mb-2">
                      <span className="text-[#B91C1C] dark:text-red-400">Salary / Pay Scale:</span> {announcement.salary}
                    </p>
                  )}
                  {announcement.totalVacancy && (
                    <p className="text-sm font-bold mb-2">
                      <span className="text-[#B91C1C] dark:text-red-400">Total Post:</span> <span className="text-xl text-[#047857]">{announcement.totalVacancy}</span>
                    </p>
                  )}
                  {announcement.minQualification && (
                    <p className="text-sm font-bold mt-4 p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded">
                      <span className="text-[#B91C1C] dark:text-red-400">Eligibility:</span> {announcement.minQualification}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Description / Content Box */}
            {(announcement.description || announcement.content) && (
              <div className="border border-gray-300 dark:border-gray-700 mb-8">
                <div className="bg-gray-100 dark:bg-gray-800 text-[#B91C1C] dark:text-red-400 font-bold text-center py-2 text-sm border-b border-gray-300 dark:border-gray-700">
                  How to Apply / Information
                </div>
                <div className="p-4 text-sm font-medium text-gray-800 dark:text-gray-200 leading-relaxed prose dark:prose-invert max-w-none"
                     dangerouslySetInnerHTML={{ __html: announcement.content ?? announcement.description ?? '' }} />
              </div>
            )}

            {/* Important Links Table (Classic Sarkari Style) */}
            <div className="border-2 border-[#B91C1C] dark:border-red-900 overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr>
                    <th colSpan={2} className="bg-[#B91C1C] text-white font-bold py-3 text-lg sm:text-xl uppercase tracking-wider">
                      Some Useful Important Links
                    </th>
                  </tr>
                </thead>
                <tbody className="text-sm sm:text-base font-bold">
                  {announcement.applyLink && (
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 text-[#0000EE] dark:text-blue-400 w-1/2">
                        Apply Online
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 p-3">
                        <a href={announcement.applyLink} target="_blank" rel="noopener noreferrer" className="text-[#B91C1C] dark:text-red-400 hover:underline">
                          Click Here
                        </a>
                      </td>
                    </tr>
                  )}
                  {announcement.officialLink && (
                    <tr>
                      <td className="border border-gray-300 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 text-[#0000EE] dark:text-blue-400 w-1/2">
                        Download Notification
                      </td>
                      <td className="border border-gray-300 dark:border-gray-700 p-3">
                        <a href={announcement.officialLink} target="_blank" rel="noopener noreferrer" className="text-[#B91C1C] dark:text-red-400 hover:underline">
                          Click Here
                        </a>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 text-[#0000EE] dark:text-blue-400 w-1/2">
                      Join Our Telegram Channel
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      <a href="https://t.me/sarkariexams" target="_blank" rel="noopener noreferrer" className="text-[#B91C1C] dark:text-red-400 hover:underline">
                        Click Here
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-gray-300 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800 text-[#0000EE] dark:text-blue-400 w-1/2">
                      Official Website
                    </td>
                    <td className="border border-gray-300 dark:border-gray-700 p-3">
                      <a href={announcement.officialLink || "#"} target="_blank" rel="noopener noreferrer" className="text-[#B91C1C] dark:text-red-400 hover:underline">
                        Click Here
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
