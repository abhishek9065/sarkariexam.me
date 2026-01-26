import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header, Navigation, Footer, MobileNav } from '../components';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../utils/constants';
import { fetchJson } from '../utils/http';
import type { TabType } from '../utils/constants';
import './CommunityPage.css';

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
    const [activeTab, setActiveTab] = useState<'forums' | 'qa' | 'groups'>('forums');
    const [forums, setForums] = useState<ForumPost[]>(() => loadItems(STORAGE_KEYS.forums, []));
    const [qaThreads, setQaThreads] = useState<QaThread[]>(() => loadItems(STORAGE_KEYS.qa, []));
    const [groups, setGroups] = useState<StudyGroup[]>(() => loadItems(STORAGE_KEYS.groups, []));
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionMessage, setActionMessage] = useState<string | null>(null);

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
        <div className="app">
            <Header
                setCurrentPage={(page) => navigate('/' + page)}
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
                setShowSearch={() => { }}
                goBack={() => navigate(-1)}
                setCurrentPage={(page) => navigate('/' + page)}
                isAuthenticated={isAuthenticated}
                onShowAuth={() => { }}
            />

            <main className="main-content">
                <div className="community-hero">
                    <div>
                        <h1>Community Hub</h1>
                        <p>Discuss exams, share tips, and build study groups with other aspirants.</p>
                    </div>
                    <div className="community-actions">
                        <button className="btn btn-secondary" onClick={() => shareToWhatsApp('Join SarkariExams community!')}>
                            Share on WhatsApp
                        </button>
                        <button className="btn btn-secondary" onClick={() => shareToTelegram('Join SarkariExams community!')}>
                            Share on Telegram
                        </button>
                    </div>
                </div>

                <div className="community-tabs">
                    <button className={activeTab === 'forums' ? 'active' : ''} onClick={() => setActiveTab('forums')}>
                        Forums
                    </button>
                    <button className={activeTab === 'qa' ? 'active' : ''} onClick={() => setActiveTab('qa')}>
                        Q&amp;A
                    </button>
                    <button className={activeTab === 'groups' ? 'active' : ''} onClick={() => setActiveTab('groups')}>
                        Study Groups
                    </button>
                </div>
                {loading && <div className="community-status">Loading community updates...</div>}
                {error && <div className="community-status error">{error}</div>}
                {actionMessage && <div className="community-status success">{actionMessage}</div>}

                {activeTab === 'forums' && (
                    <section className="community-section">
                        <div className="community-card">
                            <h2>Start a discussion</h2>
                            <form onSubmit={handleAddForum} className="community-form">
                                <input
                                    type="text"
                                    placeholder="Title"
                                    value={forumDraft.title}
                                    onChange={(e) => setForumDraft({ ...forumDraft, title: e.target.value })}
                                />
                                <select
                                    value={forumDraft.category}
                                    onChange={(e) => setForumDraft({ ...forumDraft, category: e.target.value })}
                                >
                                    <option>General</option>
                                    <option>Exam Strategy</option>
                                    <option>Current Affairs</option>
                                    <option>Form Filling</option>
                                    <option>Admit Cards</option>
                                </select>
                                <textarea
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
                                <div className="empty-state">No posts yet. Start the first discussion!</div>
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
                    <section className="community-section">
                        <div className="community-card">
                            <h2>Ask a question</h2>
                            <form onSubmit={handleAddQuestion} className="community-form">
                                <textarea
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
                                <div className="empty-state">No questions yet. Be the first to ask!</div>
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
                    <section className="community-section">
                        <div className="community-card">
                            <h2>Create a study group</h2>
                            <form onSubmit={handleAddGroup} className="community-form">
                                <input
                                    type="text"
                                    placeholder="Group name"
                                    value={groupDraft.name}
                                    onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })}
                                />
                                <input
                                    type="text"
                                    placeholder="Topic (e.g., SSC CGL Tier 1)"
                                    value={groupDraft.topic}
                                    onChange={(e) => setGroupDraft({ ...groupDraft, topic: e.target.value })}
                                />
                                <select
                                    value={groupDraft.language}
                                    onChange={(e) => setGroupDraft({ ...groupDraft, language: e.target.value })}
                                >
                                    <option>Hindi</option>
                                    <option>English</option>
                                    <option>Bhojpuri</option>
                                    <option>Maithili</option>
                                </select>
                                <input
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
                                <div className="empty-state">No study groups yet. Create the first one!</div>
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

            <Footer setCurrentPage={(page) => navigate('/' + page)} />
            <MobileNav onShowAuth={() => { }} />
        </div>
    );
}

export default CommunityPage;
