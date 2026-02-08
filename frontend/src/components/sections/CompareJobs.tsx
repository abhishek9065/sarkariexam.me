import { useState } from 'react';
import type { Announcement } from '../../types';
import { formatNumber } from '../../utils/formatters';
import { formatDate } from '../../utils/formatters';

interface CompareJobsProps {
    announcements: Announcement[];
    onClose: () => void;
    onOpenAnnouncement?: (item: Announcement) => void;
}

export function CompareJobs({ announcements, onClose, onOpenAnnouncement }: CompareJobsProps) {
    const [selectedItems, setSelectedItems] = useState<Announcement[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    // Filter for jobs only
    const jobItems = announcements.filter(a => a.type === 'job');

    // Search filter
    const filteredItems = searchQuery
        ? jobItems.filter(a =>
            a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.organization.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : jobItems;

    const addToCompare = (item: Announcement) => {
        if (selectedItems.length >= 3) return;
        if (selectedItems.find(i => i.id === item.id)) return;
        setSelectedItems([...selectedItems, item]);
    };

    const removeFromCompare = (id: string) => {
        setSelectedItems(selectedItems.filter(i => i.id !== id));
    };

    const clearSelection = () => {
        setSelectedItems([]);
    };

    const handleOpenAnnouncement = (item: Announcement) => {
        if (onOpenAnnouncement) {
            onOpenAnnouncement(item);
            return;
        }
        window.location.href = `/${item.type}/${item.slug}`;
    };

    return (
        <div className="compare-jobs-modal">
            <div className="compare-overlay" onClick={onClose} />
            <div className="compare-content">
                <div className="compare-header">
                    <h2>⚖️ Compare Jobs</h2>
                    <div className="compare-header-actions">
                        <span className="compare-count">{selectedItems.length}/3 selected</span>
                        <button className="close-btn" onClick={onClose}>✕</button>
                    </div>
                </div>

                <div className="compare-body">
                    {/* Selection Area */}
                    <div className="compare-selector">
                        <h4>Select up to 3 jobs to compare</h4>
                        <input
                            type="text"
                            placeholder="🔍 Search jobs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="compare-search"
                        />
                        <div className="compare-list">
                            {filteredItems.slice(0, 10).map(item => (
                                <button
                                    key={item.id}
                                    className={`compare-item ${selectedItems.find(i => i.id === item.id) ? 'selected' : ''}`}
                                    onClick={() => addToCompare(item)}
                                    type="button"
                                >
                                    <span className="item-title">{item.title}</span>
                                    <span className="item-org">{item.organization}</span>
                                </button>
                            ))}
                        </div>
                        {selectedItems.length > 0 && (
                            <button type="button" className="clear-selection-btn" onClick={clearSelection}>
                                Clear selection
                            </button>
                        )}
                    </div>

                    {/* Comparison Table */}
                    {selectedItems.length > 0 && (
                        <div className="compare-table-wrapper">
                            <table className="compare-table">
                                <thead>
                                    <tr>
                                        <th>Feature</th>
                                        {selectedItems.map(item => (
                                            <th key={item.id}>
                                                <span className="job-name">{item.title}</span>
                                                <button className="remove-btn" onClick={() => removeFromCompare(item.id)}>✕</button>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td><strong>Organization</strong></td>
                                        {selectedItems.map(item => <td key={item.id}>{item.organization}</td>)}
                                    </tr>
                                    <tr>
                                        <td><strong>Total Posts</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id} className="highlight">
                                                {formatNumber(item.totalPosts ?? undefined, 'N/A')}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Last Date</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id} className="date">
                                                {item.deadline ? formatDate(item.deadline) : 'N/A'}
                                            </td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Qualification</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id}>{item.minQualification || 'See Notification'}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Age Limit</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id}>{item.ageLimit || 'See Notification'}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Application Fee</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id}>{item.applicationFee || 'See Notification'}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Location</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id}>{item.location || 'All India'}</td>
                                        ))}
                                    </tr>
                                    <tr>
                                        <td><strong>Actions</strong></td>
                                        {selectedItems.map(item => (
                                            <td key={item.id}>
                                                <button
                                                    type="button"
                                                    className="open-detail-btn"
                                                    onClick={() => handleOpenAnnouncement(item)}
                                                >
                                                    View Details
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
                            <p>👆 Select jobs from the list to compare</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
