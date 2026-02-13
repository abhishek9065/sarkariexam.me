import { useEffect, useMemo, useState } from 'react';
import type { Announcement } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { formatDate } from '../../utils/formatters';

interface CompareJobsProps {
    announcements: Announcement[];
    selected?: Announcement[];
    onSelectionChange?: (items: Announcement[]) => void;
    onViewJob?: (item: Announcement) => void;
    onClose: () => void;
}

const MAX_COMPARE = 3;

export function CompareJobs({ announcements, selected = [], onSelectionChange, onViewJob, onClose }: CompareJobsProps) {
    const [selectedItems, setSelectedItems] = useState<Announcement[]>(selected);
    const [searchQuery, setSearchQuery] = useState('');
    const [sourceFilter, setSourceFilter] = useState<'all' | 'job'>('job');

    useEffect(() => {
        setSelectedItems(selected);
    }, [selected]);

    const pool = useMemo(() => {
        const map = new Map<string, Announcement>();
        for (const item of announcements) {
            if (sourceFilter === 'job' && item.type !== 'job') continue;
            const key = item.id || item.slug;
            if (!key) continue;
            if (!map.has(key)) map.set(key, item);
        }
        return Array.from(map.values());
    }, [announcements, sourceFilter]);

    const filteredItems = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        if (!q) return pool;
        return pool.filter((item) =>
            item.title.toLowerCase().includes(q) ||
            item.organization.toLowerCase().includes(q) ||
            item.type.toLowerCase().includes(q)
        );
    }, [pool, searchQuery]);

    const addToCompare = (item: Announcement) => {
        const key = item.id || item.slug;
        if (!key) return;
        if (selectedItems.length >= MAX_COMPARE) return;
        if (selectedItems.find((entry) => (entry.id || entry.slug) === key)) return;
        const next = [...selectedItems, item];
        setSelectedItems(next);
        onSelectionChange?.(next);
    };

    const removeFromCompare = (item: Announcement) => {
        const key = item.id || item.slug;
        const next = selectedItems.filter((entry) => (entry.id || entry.slug) !== key);
        setSelectedItems(next);
        onSelectionChange?.(next);
    };

    return (
        <div className="compare-jobs-modal" role="dialog" aria-modal="true" aria-label="Compare jobs">
            <div className="compare-overlay" onClick={onClose} />
            <div className="compare-content">
                <div className="compare-header">
                    <h2>Compare Jobs</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
                </div>

                <div className="compare-body">
                    <div className="compare-selector">
                        <h4>Select up to {MAX_COMPARE} jobs to compare</h4>
                        <div className="compare-filter-row">
                            <button
                                type="button"
                                className={sourceFilter === 'job' ? 'active' : ''}
                                onClick={() => setSourceFilter('job')}
                            >
                                Jobs only
                            </button>
                            <button
                                type="button"
                                className={sourceFilter === 'all' ? 'active' : ''}
                                onClick={() => setSourceFilter('all')}
                            >
                                Mixed sources
                            </button>
                        </div>
                        <input
                            type="text"
                            placeholder="Search by title, organization..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="compare-search"
                        />
                        <div className="compare-list">
                            {filteredItems.slice(0, 10).map(item => (
                                <div
                                    key={item.id || item.slug}
                                    className={`compare-item ${selectedItems.find(i => (i.id || i.slug) === (item.id || item.slug)) ? 'selected' : ''}`}
                                >
                                    <button
                                        type="button"
                                        onClick={() => addToCompare(item)}
                                        disabled={selectedItems.length >= MAX_COMPARE && !selectedItems.some((entry) => (entry.id || entry.slug) === (item.id || item.slug))}
                                    >
                                        <span className="item-title">{item.title}</span>
                                        <span className="item-org">{item.organization}</span>
                                    </button>
                                </div>
                            ))}
                            {filteredItems.length === 0 && <div className="compare-empty">No matching items for compare.</div>}
                        </div>
                    </div>

                    {selectedItems.length > 0 && (
                        <div className="compare-table-wrapper">
                            <table className="compare-table">
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        {selectedItems.map(item => (
                                            <th key={item.id || item.slug}>
                                                <span className="job-name">{item.title}</span>
                                                <button className="remove-btn" onClick={() => removeFromCompare(item)}>✕</button>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Organization</strong></td>
                                        {selectedItems.map(item => <td key={item.id || item.slug}>{item.organization}</td>)}
                                    </tr>
                                    <tr>
                                        <td><strong>Total Posts</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id || item.slug} className="highlight">
                                                {formatNumber(item.totalPosts ?? undefined, 'N/A')}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Last Date</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id || item.slug} className="date">
                                                {item.deadline ? formatDate(item.deadline) : 'N/A'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Qualification</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id || item.slug}>{item.minQualification || 'See Notification'}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Age Limit</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id || item.slug}>{item.ageLimit || 'See Notification'}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Application Fee</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id || item.slug}>{item.applicationFee || 'See Notification'}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Location</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id || item.slug}>{item.location || 'All India'}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Actions</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id || item.slug}>
                                                <button
                                                    type="button"
                                                    className="compare-open-btn"
                                                    onClick={() => onViewJob?.(item)}
                                                    disabled={!onViewJob}
                                                >
                                                    View Job
                                                </button>
                                            </td>
                                        ))}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {selectedItems.length === 0 && (
                        <div className="compare-empty">
                            <p>Select listings from the list to compare.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
