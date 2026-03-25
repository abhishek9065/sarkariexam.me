'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCalendarAnnouncements, getUpcomingDeadlines } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, Clock } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek, isSameDay, parseISO } from 'date-fns';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500',
  pending: 'bg-yellow-500',
  scheduled: 'bg-blue-500',
  published: 'bg-green-500',
  archived: 'bg-gray-400',
};

const TYPE_LABELS: Record<string, string> = {
  job: 'Job',
  result: 'Result',
  'admit-card': 'Admit Card',
  syllabus: 'Syllabus',
  'answer-key': 'Answer Key',
  admission: 'Admission',
};

interface CalendarEvent {
  id: string;
  title: string;
  type: string;
  status: string;
  deadline?: string;
  publishAt?: string;
  createdAt: string;
}

export function CalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar', monthStart.toISOString(), monthEnd.toISOString(), filterStatus, filterType],
    queryFn: async () => {
      const res = await getCalendarAnnouncements({
        start: monthStart.toISOString(),
        end: monthEnd.toISOString(),
        status: filterStatus !== 'all' ? filterStatus : undefined,
        type: filterType !== 'all' ? filterType : undefined,
      });
      return res.data;
    },
  });

  const { data: upcomingDeadlines } = useQuery({
    queryKey: ['upcoming-deadlines'],
    queryFn: async () => {
      const res = await getUpcomingDeadlines(5);
      return res.data;
    },
  });

  const calendarDays = useMemo(() => {
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [calendarStart, calendarEnd]);

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    if (!events) return [];
    return events.filter(event => {
      const dates = [
        event.deadline && parseISO(event.deadline),
        event.publishAt && parseISO(event.publishAt),
        parseISO(event.createdAt),
      ].filter(Boolean) as Date[];
      return dates.some(d => isSameDay(d, day));
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(direction === 'prev' ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Calendar</h1>
          <p className="text-muted-foreground mt-1">Schedule and manage announcement deadlines</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="job">Jobs</SelectItem>
              <SelectItem value="result">Results</SelectItem>
              <SelectItem value="admit-card">Admit Cards</SelectItem>
              <SelectItem value="syllabus">Syllabus</SelectItem>
              <SelectItem value="answer-key">Answer Keys</SelectItem>
              <SelectItem value="admission">Admissions</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Calendar */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <h2 className="text-xl font-semibold min-w-[200px] text-center">
                  {format(currentDate, 'MMMM yyyy')}
                </h2>
                <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                Today
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-px bg-border border rounded-t-lg overflow-hidden">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="bg-muted p-2 text-center text-sm font-medium">
                  {day}
                </div>
              ))}
            </div>
            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-border border border-t-0 rounded-b-lg overflow-hidden">
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const isTodayDate = isToday(day);
                
                return (
                  <div
                    key={day.toISOString()}
                    className={`bg-background min-h-[100px] p-2 ${
                      !isCurrentMonth ? 'bg-muted/30 text-muted-foreground' : ''
                    } ${isTodayDate ? 'bg-blue-50' : ''}`}
                  >
                    <div className={`text-sm font-medium mb-1 ${isTodayDate ? 'text-blue-600 font-bold' : ''}`}>
                      {format(day, 'd')}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map(event => (
                        <Link
                          key={event.id}
                          href={`/announcements/${event.id}/edit`}
                          className="block"
                        >
                          <div className={`text-xs truncate px-1.5 py-0.5 rounded text-white ${STATUS_COLORS[event.status] || 'bg-gray-500'}`}>
                            {event.title.slice(0, 20)}{event.title.length > 20 ? '...' : ''}
                          </div>
                        </Link>
                      ))}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Upcoming Deadlines */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <CardTitle className="text-base">Upcoming Deadlines</CardTitle>
              </div>
              <CardDescription>Next 30 days</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingDeadlines?.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No upcoming deadlines</p>
              ) : (
                upcomingDeadlines?.map(deadline => (
                  <Link
                    key={deadline.id}
                    href={`/announcements/${deadline.id}/edit`}
                    className="block p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium line-clamp-2">{deadline.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{TYPE_LABELS[deadline.type]}</p>
                      </div>
                      <Badge variant={deadline.daysLeft <= 3 ? 'destructive' : 'secondary'} className="shrink-0">
                        {deadline.daysLeft}d
                      </Badge>
                    </div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Status Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(STATUS_COLORS).map(([status, color]) => (
                  <div key={status} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${color}`} />
                    <span className="text-sm capitalize">{status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
