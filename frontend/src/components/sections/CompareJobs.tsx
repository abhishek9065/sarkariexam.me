import { useState } from 'react';
import type { Announcement } from '../../types';
import { formatDate } from '../../utils/formatters';

interface CompareJobsProps {
    announcements: Announcement[];
    onClose: () => void;
}

export function CompareJobs({ announcements, onClose }: CompareJobsProps) {
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

    return (
        <div className="compare-jobs-modal">
            <div className="compare-overlay" onClick={onClose} />
            <div className="compare-content">
                <div className="compare-header">
                    <h2>⚖️ Compare Jobs</h2>
                    <button className="close-btn" onClick={onClose}>✕</button>
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
                                <div
                                    key={item.id}
                                    className={`compare-item ${selectedItems.find(i => i.id === item.id) ? 'selected' : ''}`}
                                    onClick={() => addToCompare(item)}
                                >
                                    <span className="item-title">{item.title}</span>
                                    <span className="item-org">{item.organization}</span>
                                </div>
                            ))}
                        </div>
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
                                                {item.totalPosts?.toLocaleString() || 'N/A'}
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
