import type { Announcement } from '../../types';

interface ExportButtonsProps {
    bookmarks: Announcement[];
}

/**
 * Export bookmarks to CSV or print as PDF
 */
export function ExportButtons({ bookmarks }: ExportButtonsProps) {
    if (bookmarks.length === 0) return null;

    const exportToCSV = () => {
        const headers = ['Title', 'Organization', 'Type', 'Deadline', 'Location', 'Total Posts', 'Link'];

        const rows = bookmarks.map(item => [
            item.title,
            item.organization || '',
            item.type,
            item.deadline || '',
            item.location || '',
            item.totalPosts?.toString() || '',
            item.externalLink || ''
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `sarkari-bookmarks-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const printAsPDF = () => {
        const printContent = `
            <html>
            <head>
                <title>My Sarkari Bookmarks</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; }
                    h1 { color: #8B0000; text-align: center; }
                    .bookmark { border-bottom: 1px solid #ddd; padding: 15px 0; }
                    .title { font-weight: bold; color: #0000cc; font-size: 14px; }
                    .org { color: #cc0000; font-size: 12px; }
                    .meta { color: #666; font-size: 11px; margin-top: 5px; }
                    .footer { text-align: center; margin-top: 30px; color: #888; font-size: 10px; }
                </style>
            </head>
            <body>
                <h1>📋 My Sarkari Bookmarks</h1>
                <p style="text-align: center; color: #666;">Exported on ${new Date().toLocaleDateString('en-IN')}</p>
                ${bookmarks.map(item => `
                    <div class="bookmark">
                        <div class="title">${item.title}</div>
                        ${item.organization ? `<div class="org">${item.organization}</div>` : ''}
                        <div class="meta">
                            ${item.type.toUpperCase()} 
                            ${item.deadline ? `• Deadline: ${new Date(item.deadline).toLocaleDateString('en-IN')}` : ''}
                            ${item.location ? `• ${item.location}` : ''}
                            ${item.totalPosts ? `• ${item.totalPosts} Posts` : ''}
                        </div>
                    </div>
                `).join('')}
                <div class="footer">Sarkari Result Gold - https://sarkariexams.me</div>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printContent);
            printWindow.document.close();
            printWindow.print();
        }
    };

    return (
        <div className="export-buttons">
            <button className="export-btn csv" onClick={exportToCSV} title="Export as CSV">
                📥 CSV
            </button>
            <button className="export-btn pdf" onClick={printAsPDF} title="Print as PDF">
                🖨️ PDF
            </button>
        </div>
    );
}

export default ExportButtons;
