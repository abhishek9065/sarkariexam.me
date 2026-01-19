interface QuickActionsProps {
    applyLink?: string;
    notificationLink?: string;
    admitCardLink?: string;
    resultLink?: string;
    syllabusLink?: string;
    onBookmark?: () => void;
    isBookmarked?: boolean;
}

/**
 * Quick Action Buttons for job detail pages
 * Apply Now, Download, Bookmark etc
 */
export function QuickActionsBar({
    applyLink,
    notificationLink,
    admitCardLink,
    resultLink,
    syllabusLink,
    onBookmark,
    isBookmarked = false
}: QuickActionsProps) {
    return (
        <div className="quick-actions-bar">
            {applyLink && (
                <a
                    href={applyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-action-btn apply"
                >
                    ✏️ Apply Online
                </a>
            )}

            {notificationLink && (
                <a
                    href={notificationLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-action-btn notification"
                >
                    📄 Download Notification
                </a>
            )}

            {admitCardLink && (
                <a
                    href={admitCardLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-action-btn admit"
                >
                    🎫 Download Admit Card
                </a>
            )}

            {resultLink && (
                <a
                    href={resultLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-action-btn result"
                >
                    📊 Check Result
                </a>
            )}

            {syllabusLink && (
                <a
                    href={syllabusLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="quick-action-btn syllabus"
                >
                    📚 View Syllabus
                </a>
            )}

            {onBookmark && (
                <button
                    onClick={onBookmark}
                    className={`quick-action-btn bookmark ${isBookmarked ? 'active' : ''}`}
                >
                    {isBookmarked ? '⭐ Bookmarked' : '☆ Bookmark'}
                </button>
            )}
        </div>
    );
}

export default QuickActionsBar;
