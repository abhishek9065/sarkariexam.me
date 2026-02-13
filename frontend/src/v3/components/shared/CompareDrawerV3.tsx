import type { Announcement } from '../../../types';
import { formatNumber } from '../../../utils';

interface CompareDrawerV3Props {
    open: boolean;
    items: Announcement[];
    maxItems: number;
    onClose: () => void;
    onRemove: (item: Announcement) => void;
    onClear: () => void;
    onViewJob: (item: Announcement) => void;
}

const toSalaryRange = (item: Announcement): string => {
    if (item.salaryMin != null && item.salaryMax != null) {
        return `Rs ${formatNumber(item.salaryMin)} - ${formatNumber(item.salaryMax)}`;
    }
    if (item.salaryMin != null) return `Rs ${formatNumber(item.salaryMin)}+`;
    if (item.salaryMax != null) return `Up to Rs ${formatNumber(item.salaryMax)}`;
    return 'As per rules';
};

export function CompareDrawerV3({
    open,
    items,
    maxItems,
    onClose,
    onRemove,
    onClear,
    onViewJob,
}: CompareDrawerV3Props) {
    if (!open) return null;

    return (
        <div className="sr3-compare-overlay" role="dialog" aria-modal="true" aria-label="Compare jobs">
            <button type="button" className="sr3-compare-backdrop" onClick={onClose} aria-label="Close compare drawer" />
            <section className="sr3-compare-drawer sr3-surface">
                <header className="sr3-compare-head">
                    <div>
                        <h2 className="sr3-section-title">Compare Jobs</h2>
                        <p className="sr3-section-subtitle">Select up to {maxItems} jobs to compare.</p>
                    </div>
                    <div className="sr3-meta-row">
                        <button type="button" className="sr3-btn secondary" onClick={onClear} disabled={items.length === 0}>
                            Clear
                        </button>
                        <button type="button" className="sr3-btn secondary" onClick={onClose}>Close</button>
                    </div>
                </header>

                {items.length === 0 && (
                    <p className="sr3-empty">No jobs selected yet. Add jobs from home, category, detail, or profile.</p>
                )}

                {items.length > 0 && (
                    <div className="sr3-compare-table-wrap">
                        <table className="sr3-compare-table">
                            <thead>
                                <tr>
                                    <th>Field</th>
                                    {items.map((item) => (
                                        <th key={item.id || item.slug}>{item.title}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Organization</td>
                                    {items.map((item) => <td key={`${item.slug}-org`}>{item.organization || '-'}</td>)}
                                </tr>
                                <tr>
                                    <td>Total Posts</td>
                                    {items.map((item) => (
                                        <td key={`${item.slug}-posts`}>
                                            {item.totalPosts != null ? formatNumber(item.totalPosts) : '-'}
                                        </td>
                                    ))}
                                </tr>
                                <tr>
                                    <td>Salary</td>
                                    {items.map((item) => <td key={`${item.slug}-salary`}>{toSalaryRange(item)}</td>)}
                                </tr>
                                <tr>
                                    <td>Qualification</td>
                                    {items.map((item) => <td key={`${item.slug}-qual`}>{item.minQualification || '-'}</td>)}
                                </tr>
                                <tr>
                                    <td>Deadline</td>
                                    {items.map((item) => <td key={`${item.slug}-deadline`}>{item.deadline || '-'}</td>)}
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {items.length > 0 && (
                    <footer className="sr3-compare-actions">
                        {items.map((item) => (
                            <div key={`${item.slug}-action`} className="sr3-compare-action-card">
                                <button type="button" className="sr3-btn" onClick={() => onViewJob(item)}>
                                    View {item.title}
                                </button>
                                <button type="button" className="sr3-btn secondary" onClick={() => onRemove(item)}>
                                    Remove
                                </button>
                            </div>
                        ))}
                    </footer>
                )}
            </section>
        </div>
    );
}

export default CompareDrawerV3;
