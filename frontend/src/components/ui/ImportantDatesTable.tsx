interface ImportantDate {
    label: string;
    date: string | Date;
    type?: 'start' | 'end' | 'exam' | 'result' | 'other';
}

interface ImportantDatesTableProps {
    dates: ImportantDate[];
    title?: string;
}

/**
 * Important Dates Table - Classic Sarkari Result style
 * Shows key dates like application start, end, exam, result
 */
export function ImportantDatesTable({ dates, title = 'Important Dates' }: ImportantDatesTableProps) {
    if (!dates || dates.length === 0) return null;

    const formatDate = (date: string | Date) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getDateIcon = (type?: string) => {
        switch (type) {
            case 'start': return '🟢';
            case 'end': return '🔴';
            case 'exam': return '📝';
            case 'result': return '📊';
            default: return '📅';
        }
    };

    const isPast = (date: string | Date) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        return d < new Date();
    };

    return (
        <div className="important-dates-table">
            <div className="dates-header">{title}</div>
            <table>
                <tbody>
                    {dates.map((item, index) => (
                        <tr key={index} className={isPast(item.date) ? 'past-date' : ''}>
                            <td className="date-label">
                                {getDateIcon(item.type)} {item.label}
                            </td>
                            <td className="date-value">{formatDate(item.date)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ImportantDatesTable;
