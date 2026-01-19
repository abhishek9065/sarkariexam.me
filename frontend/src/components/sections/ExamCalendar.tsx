import { useState, useMemo } from 'react';
import type { Announcement } from '../../types';

interface ExamCalendarProps {
    announcements: Announcement[];
    onItemClick: (item: Announcement) => void;
}

export function ExamCalendar({ announcements, onItemClick }: ExamCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    // Get announcements with deadlines
    const eventsWithDates = useMemo(() => {
        return announcements
            .filter(a => a.deadline)
            .map(a => ({
                ...a,
                date: new Date(a.deadline!)
            }))
            .sort((a, b) => a.date.getTime() - b.date.getTime());
    }, [announcements]);

    // Group events by date
    const eventsByDate = useMemo(() => {
        const map = new Map<string, typeof eventsWithDates>();
        eventsWithDates.forEach(event => {
            const key = event.date.toISOString().split('T')[0];
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(event);
        });
        return map;
    }, [eventsWithDates]);

    // Generate calendar days
    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startDayOfWeek = firstDay.getDay();

        const days: (Date | null)[] = [];

        // Add empty cells for days before the first
        for (let i = 0; i < startDayOfWeek; i++) {
            days.push(null);
        }

        // Add all days of the month
        for (let i = 1; i <= daysInMonth; i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    }, [currentMonth]);

    const prevMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));
    };

    const nextMonth = () => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    };

    const isToday = (date: Date) => {
        const today = new Date();
        return date.toDateString() === today.toDateString();
    };

    const getEventsForDate = (date: Date) => {
        const key = date.toISOString().split('T')[0];
        return eventsByDate.get(key) || [];
    };

    // Upcoming deadlines (next 30 days)
    const upcomingDeadlines = useMemo(() => {
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        return eventsWithDates.filter(e => e.date >= now && e.date <= thirtyDaysLater).slice(0, 10);
    }, [eventsWithDates]);

    return (
        <div className="exam-calendar">
            <div className="calendar-header">
                <h2>📅 Exam Calendar</h2>
                <div className="calendar-nav">
                    <button onClick={prevMonth}>◀</button>
                    <span className="current-month">
                        {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
                    </span>
                    <button onClick={nextMonth}>▶</button>
                </div>
            </div>

            <div className="calendar-grid">
                <div className="calendar-weekdays">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="weekday">{day}</div>
                    ))}
                </div>

                <div className="calendar-days">
                    {calendarDays.map((date, idx) => {
                        if (!date) return <div key={`empty-${idx}`} className="day empty" />;

                        const events = getEventsForDate(date);
                        const hasEvents = events.length > 0;

                        return (
                            <div
                                key={date.toISOString()}
                                className={`day ${isToday(date) ? 'today' : ''} ${hasEvents ? 'has-events' : ''}`}
                            >
                                <span className="day-number">{date.getDate()}</span>
                                {hasEvents && (
                                    <div className="day-events">
                                        {events.slice(0, 2).map(e => (
                                            <div
                                                key={e.id}
                                                className={`event-dot ${e.type}`}
                                                title={e.title}
                                                onClick={() => onItemClick(e)}
                                            />
                                        ))}
                                        {events.length > 2 && <span className="more">+{events.length - 2}</span>}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Upcoming Deadlines List */}
            <div className="upcoming-deadlines">
                <h3>⏰ Upcoming Deadlines</h3>
                <ul>
                    {upcomingDeadlines.length > 0 ? (
                        upcomingDeadlines.map(event => (
                            <li key={event.id} onClick={() => onItemClick(event)}>
                                <span className={`type-badge ${event.type}`}>{event.type}</span>
                                <span className="event-title">{event.title}</span>
                                <span className="event-date">
                                    {event.date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </span>
                            </li>
                        ))
                    ) : (
                        <li className="no-events">No upcoming deadlines</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
