import { useState, useMemo, useCallback } from 'react';
import './ScheduleCalendar.css';

interface ScheduledItem {
    id: string;
    title: string;
    organization?: string;
    publishAt?: string;
    type?: string;
    status?: string;
}

interface ScheduleCalendarProps<T extends ScheduledItem> {
    items: T[];
    onItemClick?: (item: T) => void;
    onReschedule?: (itemId: string, newDate: Date) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

function getDateKey(dateInput: string | Date | undefined | null): string {
    if (!dateInput) return '';
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return '';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function ScheduleCalendar<T extends ScheduledItem>({ items, onItemClick, onReschedule }: ScheduleCalendarProps<T>) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const [draggedItem, setDraggedItem] = useState<T | null>(null);

    const calendarDays = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        // First day of the month
        const firstDay = new Date(year, month, 1);
        // Start from the Sunday of the week containing the first day
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());

        // Create 6 weeks of days (42 days total for consistent grid)
        const days: Array<{
            date: Date;
            key: string;
            isCurrentMonth: boolean;
            isToday: boolean;
            items: T[];
        }> = [];

        for (let i = 0; i < 42; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const key = getDateKey(date);

            days.push({
                date,
                key,
                isCurrentMonth: date.getMonth() === month,
                isToday: getDateKey(date) === getDateKey(today),
                items: items.filter(item => getDateKey(item.publishAt) === key),
            });
        }

        return days;
    }, [currentMonth, items, today]);

    const goToPrevMonth = useCallback(() => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    }, [currentMonth]);

    const goToNextMonth = useCallback(() => {
        setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    }, [currentMonth]);

    const goToToday = useCallback(() => {
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    }, [today]);

    const handleDragStart = useCallback((e: React.DragEvent, item: T) => {
        setDraggedItem(item);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', item.id);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }, []);

    const handleDrop = useCallback((e: React.DragEvent, targetDate: Date) => {
        e.preventDefault();
        if (draggedItem && onReschedule) {
            onReschedule(draggedItem.id, targetDate);
        }
        setDraggedItem(null);
    }, [draggedItem, onReschedule]);

    const handleDragEnd = useCallback(() => {
        setDraggedItem(null);
    }, []);

    // Get total count for the month
    const monthTotal = useMemo(() =>
        calendarDays
            .filter(d => d.isCurrentMonth)
            .reduce((sum, d) => sum + d.items.length, 0),
        [calendarDays]);

    return (
        <div className="schedule-calendar-grid">
            <div className="calendar-header">
                <div className="calendar-nav">
                    <button
                        className="calendar-nav-btn"
                        onClick={goToPrevMonth}
                        title="Previous month"
                    >
                        ←
                    </button>
                    <h3 className="calendar-title">
                        {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </h3>
                    <button
                        className="calendar-nav-btn"
                        onClick={goToNextMonth}
                        title="Next month"
                    >
                        →
                    </button>
                </div>
                <div className="calendar-actions">
                    <span className="calendar-count">{monthTotal} scheduled</span>
                    <button className="calendar-today-btn" onClick={goToToday}>
                        Today
                    </button>
                </div>
            </div>

            <div className="calendar-weekdays">
                {WEEKDAYS.map(day => (
                    <div key={day} className="calendar-weekday">{day}</div>
                ))}
            </div>

            <div className="calendar-days">
                {calendarDays.map((day) => (
                    <div
                        key={day.key}
                        className={`calendar-day ${day.isCurrentMonth ? '' : 'other-month'
                            } ${day.isToday ? 'today' : ''} ${day.items.length > 0 ? 'has-items' : ''
                            } ${draggedItem ? 'drop-target' : ''}`}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, day.date)}
                    >
                        <div className="day-number">{day.date.getDate()}</div>
                        <div className="day-items">
                            {day.items.slice(0, 3).map((item) => (
                                <div
                                    key={item.id}
                                    className={`day-item type-${item.type || 'job'}`}
                                    onClick={() => onItemClick?.(item)}
                                    draggable={!!onReschedule}
                                    onDragStart={(e) => handleDragStart(e, item)}
                                    onDragEnd={handleDragEnd}
                                    title={`${item.title}\n${item.organization || ''}`}
                                >
                                    <span className="item-title">{item.title}</span>
                                </div>
                            ))}
                            {day.items.length > 3 && (
                                <div className="day-more">
                                    +{day.items.length - 3} more
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default ScheduleCalendar;
