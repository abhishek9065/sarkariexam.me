import { useState, useEffect } from 'react';

interface DeadlineCountdownProps {
    deadline: string | Date;
    label?: string;
    showDays?: boolean;
    compact?: boolean;
}

/**
 * Deadline countdown timer for job applications
 * Shows urgency with color coding
 */
export function DeadlineCountdown({
    deadline,
    label = 'Last Date',
    showDays = true,
    compact = false
}: DeadlineCountdownProps) {
    const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

    function calculateTimeLeft() {
        const deadlineDate = typeof deadline === 'string' ? new Date(deadline) : deadline;
        const now = new Date();
        const diff = deadlineDate.getTime() - now.getTime();

        if (diff <= 0) {
            return { expired: true, days: 0, hours: 0, minutes: 0, seconds: 0 };
        }

        return {
            expired: false,
            days: Math.floor(diff / (1000 * 60 * 60 * 24)),
            hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
            seconds: Math.floor((diff % (1000 * 60)) / 1000),
        };
    }

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft(calculateTimeLeft());
        }, 1000);

        return () => clearInterval(timer);
    }, [deadline]);

    // Determine urgency level
    const getUrgencyClass = () => {
        if (timeLeft.expired) return 'expired';
        if (timeLeft.days === 0) return 'critical'; // Today
        if (timeLeft.days <= 3) return 'urgent'; // 1-3 days
        if (timeLeft.days <= 7) return 'warning'; // 4-7 days
        return 'normal';
    };

    if (timeLeft.expired) {
        return (
            <div className={`deadline-countdown expired ${compact ? 'compact' : ''}`}>
                <span className="deadline-label">❌ Application Closed</span>
            </div>
        );
    }

    if (compact) {
        return (
            <span className={`deadline-badge ${getUrgencyClass()}`}>
                ⏰ {timeLeft.days}d {timeLeft.hours}h left
            </span>
        );
    }

    return (
        <div className={`deadline-countdown ${getUrgencyClass()}`}>
            <div className="deadline-label">⏰ {label}</div>
            <div className="countdown-timer">
                {showDays && (
                    <div className="time-unit">
                        <span className="time-value">{timeLeft.days}</span>
                        <span className="time-label">Days</span>
                    </div>
                )}
                <div className="time-unit">
                    <span className="time-value">{String(timeLeft.hours).padStart(2, '0')}</span>
                    <span className="time-label">Hours</span>
                </div>
                <div className="time-unit">
                    <span className="time-value">{String(timeLeft.minutes).padStart(2, '0')}</span>
                    <span className="time-label">Min</span>
                </div>
                <div className="time-unit">
                    <span className="time-value">{String(timeLeft.seconds).padStart(2, '0')}</span>
                    <span className="time-label">Sec</span>
                </div>
            </div>
            {timeLeft.days <= 3 && (
                <div className="urgency-message">
                    🔴 Apply Now! Only {timeLeft.days === 0 ? 'hours' : `${timeLeft.days} days`} left!
                </div>
            )}
        </div>
    );
}

export default DeadlineCountdown;
