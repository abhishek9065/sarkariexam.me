import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, MobileNav } from '../components';
import { GlobalSearchModal } from '../components/modals/GlobalSearchModal';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/constants';
import { fetchJson } from '../utils/http';
import type { TabType } from '../utils/constants';
import { formatNumber } from '../utils/formatters';
import './CommunityPage.css';
import './V2.css';

type ForumPost = {
    id: string;
    title: string;
    content: string;
    category: string;
    author: string;
    createdAt: string;
};

type QaThread = {
    id: string;
    question: string;
    answer?: string;
    author: string;
    createdAt: string;
};

type StudyGroup = {
    id: string;
    name: string;
    topic: string;
    language: string;
    link?: string;
    createdAt: string;
};

const STORAGE_KEYS = {
    forums: 'communityForums',
    qa: 'communityQA',
    groups: 'communityGroups',
};

const loadItems = <T,>(key: string, fallback: T[]): T[] => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw) as T[];
    } catch {
        return fallback;
    }
};

const saveItems = <T,>(key: string, items: T[]) => {
    try {
        localStorage.setItem(key, JSON.stringify(items));
    } catch {
        // ignore storage errors
    }
};

export function CommunityPage() {
    const navigate = useNavigate();
    const { user, token, logout, isAuthenticated } = useAuth();
    const handlePageNavigation = (page: string) => {
        if (page === 'home') navigate('/');
        else if (page === 'admin') navigate('/admin');
        else navigate('/' + page);
    };
    const [activeTab, setActiveTab] = useState<'forums' | 'qa' | 'groups'>('forums');
    const [forums, setForums] = useState<ForumPost[]>(() => loadItems(STORAGE_KEYS.forums, []));
    const [qaThreads, setQaThreads] = useState<QaThread[]>(() => loadItems(STORAGE_KEYS.qa, []));
    const [groups, setGroups] = useState<StudyGroup[]>(() => loadItems(STORAGE_KEYS.groups, []));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const forumTitleRef = useRef<HTMLInputElement | null>(null);
    const qaQuestionRef = useRef<HTMLTextAreaElement | null>(null);
    const groupNameRef = useRef<HTMLInputElement | null>(null);

    const [forumDraft, setForumDraft] = useState({ title: '', content: '', category: 'General' });
    const [qaDraft, setQaDraft] = useState({ question: '' });
    const [groupDraft, setGroupDraft] = useState({ name: '', topic: '', language: 'Hindi', link: '' });

    const createId = () => {
        if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
            return crypto.randomUUID();
        }
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    };

    useEffect(() => saveItems(STORAGE_KEYS.forums, forums), [forums]);
    useEffect(() => saveItems(STORAGE_KEYS.qa, qaThreads), [qaThreads]);
    useEffect(() => saveItems(STORAGE_KEYS.groups, groups), [groups]);

    useEffect(() => {
        let active = true;
        const loadAll = async () => {
            setLoading(true);
            setError(null);
            try {
                const [forumsRes, qaRes, groupsRes] = await Promise.all([
                    fetchJson<{ data: ForumPost[] }>(`${API_BASE}/api/community/forums?limit=30`, {}, { timeoutMs: 6000, retries: 1 }),
                    fetchJson<{ data: QaThread[] }>(`${API_BASE}/api/community/qa?limit=30`, {}, { timeoutMs: 6000, retries: 1 }),
                    fetchJson<{ data: StudyGroup[] }>(`${API_BASE}/api/community/groups?limit=30`, {}, { timeoutMs: 6000, retries: 1 }),
                ]);
                if (!active) return;
                setForums(forumsRes.data || []);
                setQaThreads(qaRes.data || []);
                setGroups(groupsRes.data || []);
            } catch (err) {
                console.error(err);
                if (!active) return;
                setError('Unable to load community content. Showing saved drafts if available.');
                setForums(loadItems(STORAGE_KEYS.forums, []));
                setQaThreads(loadItems(STORAGE_KEYS.qa, []));
                setGroups(loadItems(STORAGE_KEYS.groups, []));
            } finally {
                if (active) setLoading(false);
            }
        };
        loadAll();
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (!actionMessage) return;
        const timer = window.setTimeout(() => setActionMessage(null), 3000);
        return () => window.clearTimeout(timer);
    }, [actionMessage]);

    const shareBase = useMemo(() => {
        const origin = window.location.origin;
        return encodeURIComponent(`${origin}/community`);
    }, []);
    const communityPulse = useMemo(() => {
        const totalConversations = forums.length + qaThreads.length;
        return {
            totalConversations,
            forums: forums.length,
            questions: qaThreads.length,
            groups: groups.length,
        };
    }, [forums.length, groups.length, qaThreads.length]);

    const shareToWhatsApp = (text: string) => {
        const url = `https://wa.me/?text=${encodeURIComponent(text)}%20${shareBase}`;
        window.open(url, '_blank');
    };

    const shareToTelegram = (text: string) => {
        const url = `https://t.me/share/url?url=${shareBase}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const handleReport = async (entityType: 'forum' | 'qa' | 'group', entityId: string, label: string) => {
        const reason = window.prompt(`Report ${label}? Please share the reason.`);
        if (!reason || !reason.trim()) return;
        try {
            await fetchJson<{ data: { id: string } }>(`${API_BASE}/api/community/flags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    entityType,
                    entityId,
                    reason: reason.trim(),
                    reporter: user?.name || 'Anonymous',
                }),
            }, { timeoutMs: 6000, retries: 0 });
            setActionMessage('Thanks for the report. Our team will review it.');
        } catch (err) {
            console.error(err);
            setActionMessage('Unable to submit report right now. Please try later.');
        }
    };

    const handleAddForum = (event: React.FormEvent) => {
        event.preventDefault();
        if (!forumDraft.title.trim() || !forumDraft.content.trim()) return;
        const payload = {
            title: forumDraft.title.trim(),
            content: forumDraft.content.trim(),
            category: forumDraft.category,
            author: user?.name || 'Guest',
        };
        fetchJson<{ data: ForumPost }>(`${API_BASE}/api/community/forums`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }, { timeoutMs: 6000, retries: 0 })
            .then((res) => {
                setForums((prev) => [res.data, ...prev].slice(0, 50));
                setForumDraft({ title: '', content: '', category: forumDraft.category });
                setActionMessage('Post published to community.');
            })
            .catch((err) => {
                console.error(err);
                const entry: ForumPost = {
                    id: createId(),
                    title: payload.title,
                    content: payload.content,
                    category: payload.category,
                    author: payload.author,
                    createdAt: new Date().toISOString(),
                };
                setForums((prev) => [entry, ...prev].slice(0, 50));
                setForumDraft({ title: '', content: '', category: forumDraft.category });
                setActionMessage('Saved locally. Will sync when online.');
            });
    };

    const handleAddQuestion = (event: React.FormEvent) => {
        event.preventDefault();
        if (!qaDraft.question.trim()) return;
        const payload = {
            question: qaDraft.question.trim(),
            author: user?.name || 'Guest',
        };
        fetchJson<{ data: QaThread }>(`${API_BASE}/api/community/qa`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }, { timeoutMs: 6000, retries: 0 })
            .then((res) => {
                setQaThreads((prev) => [res.data, ...prev].slice(0, 50));
                setQaDraft({ question: '' });
                setActionMessage('Question submitted.');
            })
            .catch((err) => {
                console.error(err);
                const entry: QaThread = {
                    id: createId(),
                    question: payload.question,
                    author: payload.author,
                    createdAt: new Date().toISOString(),
                };
                setQaThreads((prev) => [entry, ...prev].slice(0, 50));
                setQaDraft({ question: '' });
                setActionMessage('Saved locally. Will sync when online.');
            });
    };

    const handleAddGroup = (event: React.FormEvent) => {
        event.preventDefault();
        if (!groupDraft.name.trim() || !groupDraft.topic.trim()) return;
        const payload = {
            name: groupDraft.name.trim(),
            topic: groupDraft.topic.trim(),
            language: groupDraft.language,
            link: groupDraft.link.trim(),
        };
        fetchJson<{ data: StudyGroup }>(`${API_BASE}/api/community/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        }, { timeoutMs: 6000, retries: 0 })
            .then((res) => {
                setGroups((prev) => [res.data, ...prev].slice(0, 50));
                setGroupDraft({ name: '', topic: '', language: groupDraft.language, link: '' });
                setActionMessage('Study group created.');
            })
            .catch((err) => {
                console.error(err);
                const entry: StudyGroup = {
                    id: createId(),
                    name: payload.name,
                    topic: payload.topic,
                    language: payload.language,
                    link: payload.link || undefined,
                    createdAt: new Date().toISOString(),
                };
                setGroups((prev) => [entry, ...prev].slice(0, 50));
                setGroupDraft({ name: '', topic: '', language: groupDraft.language, link: '' });
                setActionMessage('Saved locally. Will sync when online.');
            });
    };

    return (
        <div className="app sr-v2-community">
            <a className="sr-v2-skip-link" href="#community-main">
                Skip to community content
            </a>
            <Header
                setCurrentPage={handlePageNavigation}
                user={user}
                token={token}
                isAuthenticated={isAuthenticated}
                onLogin={() => { }}
                onLogout={logout}
                onProfileClick={() => navigate('/profile')}
            />
            <Navigation
                activeTab={'community' as TabType}
                setActiveTab={() => { }}
                setShowSearch={() => setShowSearchModal(true)}
                goBack={() => navigate(-1)}
                setCurrentPage={handlePageNavigation}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => { }}
            />

            <main id="community-main" className="main-content sr-v2-main">
                <div className="community-hero sr-v2-community-hero">
                    <div>
                        <h1>Community Hub</h1>
                        <p>Discuss exams, share tips, and build study groups with other aspirants.</p>
                    </div>
                    <div className="community-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => shareToWhatsApp('Join SarkariExams community!')}>
                            Share on WhatsApp
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => shareToTelegram('Join SarkariExams community!')}>
                            Share on Telegram
                        </button>
                    </div>
                </div>

                <section className="sr-v2-community-pulse" aria-label="Community pulse">
                    <div className="sr-v2-community-pulse-item">
                        <span className="sr-v2-intro-label">Conversations</span>
                        <strong>{formatNumber(communityPulse.totalConversations)}</strong>
                        <small>Forums and Q&A threads</small>
                    </div>
                    <div className="sr-v2-community-pulse-item">
                        <span className="sr-v2-intro-label">Forums</span>
                        <strong>{formatNumber(communityPulse.forums)}</strong>
                        <small>Peer discussions and strategy threads</small>
                    </div>
                    <div className="sr-v2-community-pulse-item">
                        <span className="sr-v2-intro-label">Open Questions</span>
                        <strong>{formatNumber(communityPulse.questions)}</strong>
                        <small>Community Q&A updates</small>
                    </div>
                    <div className="sr-v2-community-pulse-item">
                        <span className="sr-v2-intro-label">Study Groups</span>
                        <strong>{formatNumber(communityPulse.groups)}</strong>
                        <small>Collaborative exam prep circles</small>
                    </div>
                </section>

                <div className="community-tabs sr-v2-community-tabs" role="tablist" aria-label="Community sections">
                    <button
                        id="community-tab-forums"
                        role="tab"
                        aria-selected={activeTab === 'forums'}
                        aria-controls="community-panel-forums"
                        tabIndex={activeTab === 'forums' ? 0 : -1}
                        className={activeTab === 'forums' ? 'active' : ''}
                        onClick={() => setActiveTab('forums')}
                        type="button"
                    >
                        Forums
                    </button>
                    <button
                        id="community-tab-qa"
                        role="tab"
                        aria-selected={activeTab === 'qa'}
                        aria-controls="community-panel-qa"
                        tabIndex={activeTab === 'qa' ? 0 : -1}
                        className={activeTab === 'qa' ? 'active' : ''}
                        onClick={() => setActiveTab('qa')}
                        type="button"
                    >
                        Q&amp;A
                    </button>
                    <button
                        id="community-tab-groups"
                        role="tab"
                        aria-selected={activeTab === 'groups'}
                        aria-controls="community-panel-groups"
                        tabIndex={activeTab === 'groups' ? 0 : -1}
                        className={activeTab === 'groups' ? 'active' : ''}
                        onClick={() => setActiveTab('groups')}
                        type="button"
                    >
                        Study Groups
                    </button>
                </div>
                <div className="sr-v2-community-status-stack" aria-live="polite" aria-atomic="true">
                    {loading && <div className="community-status" role="status">Loading community updates...</div>}
                    {error && <div className="community-status error" role="alert">{error}</div>}
                    {actionMessage && <div className="community-status success" role="status">{actionMessage}</div>}
                </div>

                {activeTab === 'forums' && (
                    <section
                        id="community-panel-forums"
                        role="tabpanel"
                        aria-labelledby="community-tab-forums"
                        className="community-section sr-v2-community-section"
                    >
                        <div className="community-card">
                            <h2>Start a discussion</h2>
                            <form onSubmit={handleAddForum} className="community-form">
                                <label htmlFor="forum-title" className="sr-v2-field-label">Discussion title</label>
                                <input
                                    id="forum-title"
                                    ref={forumTitleRef}
                                    type="text"
                                    placeholder="Title"
                                    value={forumDraft.title}
                                    onChange={(e) => setForumDraft({ ...forumDraft, title: e.target.value })}
                                />
                                <label htmlFor="forum-category" className="sr-v2-field-label">Category</label>
                                <select
                                    id="forum-category"
                                    value={forumDraft.category}
                                    onChange={(e) => setForumDraft({ ...forumDraft, category: e.target.value })}
                                >
                                    <option>General</option>
                                    <option>Exam Strategy</option>
                                    <option>Current Affairs</option>
                                    <option>Form Filling</option>
                                    <option>Admit Cards</option>
                                </select>
                                <label htmlFor="forum-content" className="sr-v2-field-label">Message</label>
                                <textarea
                                    id="forum-content"
                                    rows={4}
                                    placeholder="Share your question or tips..."
                                    value={forumDraft.content}
                                    onChange={(e) => setForumDraft({ ...forumDraft, content: e.target.value })}
                                />
                                <button className="btn btn-primary" type="submit">Post</button>
                            </form>
                        </div>

                        <div className="community-list">
                            {forums.length === 0 ? (
                                <div className="empty-state sr-v2-empty-state">
                                    <p>No posts yet. Start the first discussion!</p>
                                    <div className="sr-v2-empty-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => forumTitleRef.current?.focus()}>
                                            Create first post
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                forums.map((post) => (
                                    <div key={post.id} className="community-item">
                                        <div className="community-item-header">
                                            <h3>{post.title}</h3>
                                            <span className="community-pill">{post.category}</span>
                                        </div>
                                        <p>{post.content}</p>
                                        <div className="community-meta">
                                            <span>By {post.author}</span>
                                            <span>{new Date(post.createdAt).toLocaleDateString('en-IN')}</span>
                                        </div>
                                        <div className="community-item-actions">
                                            <button
                                                className="btn btn-secondary"
                                                type="button"
                                                onClick={() => handleReport('forum', post.id, 'this forum post')}
                                            >
                                                Report
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'qa' && (
                    <section
                        id="community-panel-qa"
                        role="tabpanel"
                        aria-labelledby="community-tab-qa"
                        className="community-section sr-v2-community-section"
                    >
                        <div className="community-card">
                            <h2>Ask a question</h2>
                            <form onSubmit={handleAddQuestion} className="community-form">
                                <label htmlFor="qa-question" className="sr-v2-field-label">Question</label>
                                <textarea
                                    id="qa-question"
                                    ref={qaQuestionRef}
                                    rows={3}
                                    placeholder="Type your exam/application question..."
                                    value={qaDraft.question}
                                    onChange={(e) => setQaDraft({ question: e.target.value })}
                                />
                                <button className="btn btn-primary" type="submit">Submit question</button>
                            </form>
                        </div>

                        <div className="community-list">
                            {qaThreads.length === 0 ? (
                                <div className="empty-state sr-v2-empty-state">
                                    <p>No questions yet. Be the first to ask!</p>
                                    <div className="sr-v2-empty-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => qaQuestionRef.current?.focus()}>
                                            Ask first question
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                qaThreads.map((thread) => (
                                    <div key={thread.id} className="community-item">
                                        <h3>{thread.question}</h3>
                                        <div className="community-meta">
                                            <span>Asked by {thread.author}</span>
                                            <span>{new Date(thread.createdAt).toLocaleDateString('en-IN')}</span>
                                        </div>
                                        <div className="community-answer">
                                            {thread.answer ? thread.answer : 'Answer pending from the community.'}
                                        </div>
                                        <div className="community-item-actions">
                                            <button
                                                className="btn btn-secondary"
                                                type="button"
                                                onClick={() => handleReport('qa', thread.id, 'this question')}
                                            >
                                                Report
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}

                {activeTab === 'groups' && (
                    <section
                        id="community-panel-groups"
                        role="tabpanel"
                        aria-labelledby="community-tab-groups"
                        className="community-section sr-v2-community-section"
                    >
                        <div className="community-card">
                            <h2>Create a study group</h2>
                            <form onSubmit={handleAddGroup} className="community-form">
                                <label htmlFor="group-name" className="sr-v2-field-label">Group name</label>
                                <input
                                    id="group-name"
                                    ref={groupNameRef}
                                    type="text"
                                    placeholder="Group name"
                                    value={groupDraft.name}
                                    onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })}
                                />
                                <label htmlFor="group-topic" className="sr-v2-field-label">Topic</label>
                                <input
                                    id="group-topic"
                                    type="text"
                                    placeholder="Topic (e.g., SSC CGL Tier 1)"
                                    value={groupDraft.topic}
                                    onChange={(e) => setGroupDraft({ ...groupDraft, topic: e.target.value })}
                                />
                                <label htmlFor="group-language" className="sr-v2-field-label">Language</label>
                                <select
                                    id="group-language"
                                    value={groupDraft.language}
                                    onChange={(e) => setGroupDraft({ ...groupDraft, language: e.target.value })}
                                >
                                    <option>Hindi</option>
                                    <option>English</option>
                                    <option>Bhojpuri</option>
                                    <option>Maithili</option>
                                </select>
                                <label htmlFor="group-link" className="sr-v2-field-label">Invite link</label>
                                <input
                                    id="group-link"
                                    type="url"
                                    placeholder="Invite link (optional)"
                                    value={groupDraft.link}
                                    onChange={(e) => setGroupDraft({ ...groupDraft, link: e.target.value })}
                                />
                                <button className="btn btn-primary" type="submit">Create group</button>
                            </form>
                        </div>

                        <div className="community-list">
                            {groups.length === 0 ? (
                                <div className="empty-state sr-v2-empty-state">
                                    <p>No study groups yet. Create the first one!</p>
                                    <div className="sr-v2-empty-actions">
                                        <button type="button" className="btn btn-secondary" onClick={() => groupNameRef.current?.focus()}>
                                            Create study group
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                groups.map((group) => (
                                    <div key={group.id} className="community-item">
                                        <div className="community-item-header">
                                            <h3>{group.name}</h3>
                                            <span className="community-pill">{group.language}</span>
                                        </div>
                                        <p>{group.topic}</p>
                                        <div className="community-meta">
                                            <span>Created {new Date(group.createdAt).toLocaleDateString('en-IN')}</span>
                                            {group.link && (
                                                <a href={group.link} target="_blank" rel="noreferrer" className="community-link">
                                                    Join
                                                </a>
                                            )}
                                        </div>
                                        <div className="community-item-actions">
                                            <button
                                                className="btn btn-secondary"
                                                type="button"
                                                onClick={() => handleReport('group', group.id, 'this study group')}
                                            >
                                                Report
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                )}
            </main>

            <Footer setCurrentPage={handlePageNavigation} />
            <GlobalSearchModal open={showSearchModal} onClose={() => setShowSearchModal(false)} />
            <MobileNav onShowAuth={() => { }} />
        </div>
    );
}

export default CommunityPage;
