import { useState } from 'react';
import type {
    CommunityEntityType,
    CommunityFlag,
    CommunityForumPost,
    CommunityQaThread,
    CommunityStudyGroup,
} from '../adminTypes';
import { formatLastUpdated } from '../adminHelpers';

export type CommunityTabProps = {
    communityFlags: CommunityFlag[];
    communityForums: CommunityForumPost[];
    communityQa: CommunityQaThread[];
    communityGroups: CommunityStudyGroup[];
    communityLoading: boolean;
    communityError: string | null;
    communityUpdatedAt: string | null;
    communityMutatingIds: Set<string>;
    flagFilter: 'all' | 'open' | 'reviewed' | 'resolved';
    setFlagFilter: (v: 'all' | 'open' | 'reviewed' | 'resolved') => void;
    qaAnswerDrafts: Record<string, string>;
    setQaAnswerDrafts: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    refreshCommunity: () => void;
    handleCommunityDelete: (entityType: CommunityEntityType, entityId: string) => void;
    handleResolveFlag: (flagId: string) => void;
    handleAnswerQa: (threadId: string) => void;
    canWriteAdmin: boolean;
};

export function CommunityTab({
    communityFlags,
    communityForums,
    communityQa,
    communityGroups,
    communityLoading,
    communityError,
    communityUpdatedAt,
    communityMutatingIds,
    flagFilter,
    setFlagFilter,
    qaAnswerDrafts,
    setQaAnswerDrafts,
    refreshCommunity,
    handleCommunityDelete,
    handleResolveFlag,
    handleAnswerQa,
    canWriteAdmin,
}: CommunityTabProps) {
    const [communityTab, setCommunityTab] = useState<'flags' | 'forums' | 'qa' | 'groups'>('flags');

    return (
        <div className="admin-list">
            <div className="admin-list-header">
                <div>
                    <h3>Community moderation</h3>
                    <p className="admin-subtitle">Review reports, answer Q&amp;A, and remove abusive content.</p>
                </div>
                <div className="admin-list-actions">
                    <span className="admin-updated">{formatLastUpdated(communityUpdatedAt)}</span>
                    <button className="admin-btn secondary" onClick={refreshCommunity} disabled={communityLoading}>
                        {communityLoading ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>
            </div>

            <div className="admin-toggle">
                <button
                    className={`admin-btn secondary ${communityTab === 'flags' ? 'active' : ''}`}
                    onClick={() => setCommunityTab('flags')}
                >
                    Flags
                </button>
                <button
                    className={`admin-btn secondary ${communityTab === 'forums' ? 'active' : ''}`}
                    onClick={() => setCommunityTab('forums')}
                >
                    Forums
                </button>
                <button
                    className={`admin-btn secondary ${communityTab === 'qa' ? 'active' : ''}`}
                    onClick={() => setCommunityTab('qa')}
                >
                    Q&amp;A
                </button>
                <button
                    className={`admin-btn secondary ${communityTab === 'groups' ? 'active' : ''}`}
                    onClick={() => setCommunityTab('groups')}
                >
                    Groups
                </button>
            </div>

            {communityTab === 'flags' && (
                <div className="admin-community-filter">
                    <label htmlFor="flagFilter" className="admin-inline-label">Status</label>
                    <select
                        id="flagFilter"
                        value={flagFilter}
                        onChange={(e) => setFlagFilter(e.target.value as 'all' | 'open' | 'reviewed' | 'resolved')}
                    >
                        <option value="open">Open</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                        <option value="all">All</option>
                    </select>
                </div>
            )}

            {communityError && <div className="admin-error">{communityError}</div>}

            {communityLoading ? (
                <div className="admin-loading">Loading community moderation data...</div>
            ) : communityTab === 'flags' ? (
                <div className="admin-community-grid">
                    {communityFlags.length === 0 ? (
                        <div className="empty-state">No flags to review.</div>
                    ) : (
                        communityFlags.map((flag) => (
                            <div key={flag.id} className="admin-community-item">
                                <div className="admin-community-header">
                                    <div>
                                        <h4>Flagged {flag.entityType.toUpperCase()}</h4>
                                        <p className="admin-subtitle">{flag.reason}</p>
                                    </div>
                                    <span className={`status-pill ${flag.status === 'open' ? 'danger' : 'info'}`}>{flag.status}</span>
                                </div>
                                <div className="admin-community-meta">
                                    <span>Item ID: {flag.entityId}</span>
                                    <span>Reporter: {flag.reporter || 'Anonymous'}</span>
                                    <span>{new Date(flag.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="admin-community-actions">
                                    {canWriteAdmin && (
                                        <button
                                            className="admin-btn warning small"
                                            onClick={() => handleCommunityDelete(flag.entityType, flag.entityId)}
                                            disabled={communityMutatingIds.has(flag.entityId)}
                                        >
                                            Delete item
                                        </button>
                                    )}
                                    {canWriteAdmin && (
                                        <button
                                            className="admin-btn secondary small"
                                            onClick={() => handleResolveFlag(flag.id)}
                                            disabled={communityMutatingIds.has(flag.id)}
                                        >
                                            Resolve flag
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : communityTab === 'forums' ? (
                <div className="admin-community-grid">
                    {communityForums.length === 0 ? (
                        <div className="empty-state">No forum posts yet.</div>
                    ) : (
                        communityForums.map((post) => (
                            <div key={post.id} className="admin-community-item">
                                <div className="admin-community-header">
                                    <div>
                                        <h4>{post.title}</h4>
                                        <p className="admin-subtitle">{post.category}</p>
                                    </div>
                                </div>
                                <p className="admin-community-content">{post.content}</p>
                                <div className="admin-community-meta">
                                    <span>By {post.author}</span>
                                    <span>{new Date(post.createdAt).toLocaleString()}</span>
                                </div>
                                <div className="admin-community-actions">
                                    {canWriteAdmin && (
                                        <button
                                            className="admin-btn warning small"
                                            onClick={() => handleCommunityDelete('forum', post.id)}
                                            disabled={communityMutatingIds.has(post.id)}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : communityTab === 'qa' ? (
                <div className="admin-community-grid">
                    {communityQa.length === 0 ? (
                        <div className="empty-state">No Q&amp;A threads yet.</div>
                    ) : (
                        communityQa.map((thread) => (
                            <div key={thread.id} className="admin-community-item">
                                <div className="admin-community-header">
                                    <div>
                                        <h4>{thread.question}</h4>
                                        <p className="admin-subtitle">Asked by {thread.author}</p>
                                    </div>
                                    <span className={`status-pill ${thread.answer ? 'success' : 'warning'}`}>
                                        {thread.answer ? 'Answered' : 'Pending'}
                                    </span>
                                </div>
                                <div className="admin-community-meta">
                                    <span>{new Date(thread.createdAt).toLocaleString()}</span>
                                    {thread.answeredBy && <span>Answered by {thread.answeredBy}</span>}
                                </div>
                                <div className="admin-community-answer">
                                    {thread.answer ? thread.answer : 'No answer yet.'}
                                </div>
                                <textarea
                                    className="review-note-input compact"
                                    rows={3}
                                    placeholder="Write an official answer..."
                                    value={qaAnswerDrafts[thread.id] ?? ''}
                                    onChange={(e) => setQaAnswerDrafts((prev) => ({ ...prev, [thread.id]: e.target.value }))}
                                />
                                <div className="admin-community-actions">
                                    {canWriteAdmin && (
                                        <button
                                            className="admin-btn success small"
                                            onClick={() => handleAnswerQa(thread.id)}
                                            disabled={communityMutatingIds.has(thread.id)}
                                        >
                                            {communityMutatingIds.has(thread.id) ? 'Saving...' : 'Post answer'}
                                        </button>
                                    )}
                                    {canWriteAdmin && (
                                        <button
                                            className="admin-btn warning small"
                                            onClick={() => handleCommunityDelete('qa', thread.id)}
                                            disabled={communityMutatingIds.has(thread.id)}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="admin-community-grid">
                    {communityGroups.length === 0 ? (
                        <div className="empty-state">No study groups yet.</div>
                    ) : (
                        communityGroups.map((group) => (
                            <div key={group.id} className="admin-community-item">
                                <div className="admin-community-header">
                                    <div>
                                        <h4>{group.name}</h4>
                                        <p className="admin-subtitle">{group.topic}</p>
                                    </div>
                                    <span className="status-pill info">{group.language}</span>
                                </div>
                                <div className="admin-community-meta">
                                    <span>{new Date(group.createdAt).toLocaleString()}</span>
                                    {group.link && <span>Invite: {group.link}</span>}
                                </div>
                                <div className="admin-community-actions">
                                    {canWriteAdmin && (
                                        <button
                                            className="admin-btn warning small"
                                            onClick={() => handleCommunityDelete('group', group.id)}
                                            disabled={communityMutatingIds.has(group.id)}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}
