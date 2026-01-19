import { useState } from 'react';
import './BookmarkButton.css';

interface BookmarkButtonProps {
    announcementId: string;
    isBookmarked: boolean;
    onToggle: (announcementId: string) => Promise<void>;
    isAuthenticated: boolean;
    onLoginRequired?: () => void;
    size?: 'small' | 'medium' | 'large';
    showLabel?: boolean;
}

export function BookmarkButton({
    announcementId,
    isBookmarked,
    onToggle,
    isAuthenticated,
    onLoginRequired,
    size = 'medium',
    showLabel = false,
}: BookmarkButtonProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();

        if (!isAuthenticated) {
            onLoginRequired?.();
            return;
        }

        if (isLoading) return;

        setIsAnimating(true);
        setIsLoading(true);

        try {
            await onToggle(announcementId);
        } catch (error) {
            console.error('Bookmark toggle failed:', error);
        } finally {
            setIsLoading(false);
            setTimeout(() => setIsAnimating(false), 300);
        }
    };

    const sizeClass = {
        small: 'bookmark-btn-sm',
        medium: 'bookmark-btn-md',
        large: 'bookmark-btn-lg',
    }[size];

    return (
        <button
            className={`bookmark-btn ${sizeClass} ${isBookmarked ? 'bookmarked' : ''} ${isAnimating ? 'animating' : ''}`}
            onClick={handleClick}
            disabled={isLoading}
            title={isBookmarked ? 'Remove from saved' : 'Save for later'}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
        >
            <span className="bookmark-icon">
                {isBookmarked ? '❤️' : '🤍'}
            </span>
            {showLabel && (
                <span className="bookmark-label">
                    {isBookmarked ? 'Saved' : 'Save'}
                </span>
            )}
        </button>
    );
}

export default BookmarkButton;
