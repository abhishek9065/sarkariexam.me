import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { useAuth } from '../context/AuthContext';

export function ProfilePage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'overview' | 'settings'>('overview');

    if (!user) return null;

    return (
        <Layout>
            <div className="profile-page animate-fade-in">
                {/* Header */}
                <div className="profile-header">
                    <div className="profile-avatar-lg">
                        {(user.username || user.email)[0].toUpperCase()}
                    </div>
                    <div className="profile-header-info">
                        <h1 className="profile-name">{user.username}</h1>
                        <p className="text-muted">{user.email}</p>
                        <span className={`badge badge-${user.role === 'admin' ? 'job' : 'result'}`}>
                            {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="profile-tabs">
                    <button className={`profile-tab${activeTab === 'overview' ? ' active' : ''}`} onClick={() => setActiveTab('overview')}>
                        Overview
                    </button>
                    <button className={`profile-tab${activeTab === 'settings' ? ' active' : ''}`} onClick={() => setActiveTab('settings')}>
                        Settings
                    </button>
                </div>

                {/* Content */}
                {activeTab === 'overview' && (
                    <div className="profile-overview">
                        <div className="profile-stats-grid">
                            <ProfileStatCard icon="📅" label="Joined" value={new Date(user.createdAt).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })} />
                            <ProfileStatCard icon="🔐" label="Role" value={user.role} />
                            <ProfileStatCard icon="✅" label="Status" value={user.isActive ? 'Active' : 'Inactive'} />
                            {user.lastLogin && (
                                <ProfileStatCard icon="🕐" label="Last Login" value={new Date(user.lastLogin).toLocaleDateString('en-IN')} />
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <div className="profile-settings card">
                        <h3>Account Settings</h3>
                        <p className="text-muted">Account management features coming soon. You can currently manage your profile via the admin panel.</p>
                    </div>
                )}
            </div>
        </Layout>
    );
}

function ProfileStatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
    return (
        <div className="card profile-stat-card">
            <span className="profile-stat-icon">{icon}</span>
            <span className="profile-stat-label">{label}</span>
            <span className="profile-stat-value">{value}</span>
        </div>
    );
}
