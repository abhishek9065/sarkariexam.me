import type { Announcement } from '../../types';
import { SectionTable } from '../sections/SectionTable';

export function UserProfile({
    bookmarks,
    onItemClick,
    user,
    logout
}: {
    bookmarks: Announcement[],
    onItemClick: (item: Announcement) => void,
    user: any,
    logout: () => void
}) {
    return (
        <div className="user-profile">
            <div className="profile-header card" style={{ padding: '20px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <div>
                    <h2 style={{ margin: 0, marginBottom: '5px' }}>👤 My Profile</h2>
                    <p style={{ color: '#666', margin: 0 }}>{user?.email}</p>
                    <span className="type-badge" style={{ marginTop: '10px', display: 'inline-block' }}>{user?.role || 'User'}</span>
                </div>
                <button className="admin-btn logout" onClick={logout}>Logout</button>
            </div>

            <div className="profile-content">
                <SectionTable
                    title="❤️ Saved Bookmarks"
                    items={bookmarks}
                    onItemClick={onItemClick}
                    fullWidth
                />

                <div style={{ marginTop: '20px', padding: '20px', background: 'white', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ marginTop: 0 }}>⚙️ Preferences</h3>
                    <p style={{ color: '#666', fontStyle: 'italic' }}>Notification settings coming soon...</p>
                </div>
            </div>
        </div>
    );
}

export default UserProfile;
