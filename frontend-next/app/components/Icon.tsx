'use client';

import type { CSSProperties } from 'react';

type IconName =
    | 'House'
    | 'Briefcase'
    | 'BarChart3'
    | 'Ticket'
    | 'KeyRound'
    | 'GraduationCap'
    | 'BookOpenText'
    | 'Search'
    | 'Bell'
    | 'Bookmark'
    | 'User'
    | 'Menu'
    | 'Close'
    | 'ShieldCheck'
    | 'ArrowRight'
    | 'CalendarClock'
    | 'MapPinned'
    | 'Building2'
    | 'ExternalLink'
    | 'Clock3'
    | 'Sparkles'
    | 'Filter'
    | 'Languages'
    | 'Moon'
    | 'Sun';

const COMMON: CSSProperties = {
    width: '1em',
    height: '1em',
    stroke: 'currentColor',
    fill: 'none',
    strokeWidth: 1.85,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};

function Svg({ children }: { children: React.ReactNode }) {
    return <svg viewBox="0 0 24 24" aria-hidden="true" style={COMMON}>{children}</svg>;
}

export function Icon({ name }: { name: IconName }) {
    switch (name) {
        case 'House':
            return <Svg><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /><path d="M9.5 21v-6h5v6" /></Svg>;
        case 'Briefcase':
            return <Svg><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7" /><path d="M3 12h18" /></Svg>;
        case 'BarChart3':
            return <Svg><path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-7" /><path d="M22 20V8" /></Svg>;
        case 'Ticket':
            return <Svg><path d="M4 7h16v4a2 2 0 0 0 0 4v4H4v-4a2 2 0 0 0 0-4Z" /><path d="M12 7v10" /></Svg>;
        case 'KeyRound':
            return <Svg><circle cx="8.5" cy="15.5" r="3.5" /><path d="M12 15.5h9" /><path d="M18 15.5v-3" /><path d="M15 15.5v-2" /></Svg>;
        case 'GraduationCap':
            return <Svg><path d="m2 9 10-5 10 5-10 5Z" /><path d="M6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5" /><path d="M22 9v6" /></Svg>;
        case 'BookOpenText':
            return <Svg><path d="M4 19.5V6.5A2.5 2.5 0 0 1 6.5 4H20v15.5H6.5A2.5 2.5 0 0 0 4 22" /><path d="M8 8h7" /><path d="M8 12h7" /></Svg>;
        case 'Search':
            return <Svg><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></Svg>;
        case 'Bell':
            return <Svg><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" /><path d="M10 19a2 2 0 0 0 4 0" /></Svg>;
        case 'Bookmark':
            return <Svg><path d="M6 4h12v17l-6-3-6 3Z" /></Svg>;
        case 'User':
            return <Svg><circle cx="12" cy="8" r="3.5" /><path d="M5 20a7 7 0 0 1 14 0" /></Svg>;
        case 'Menu':
            return <Svg><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Svg>;
        case 'Close':
            return <Svg><path d="m5 5 14 14" /><path d="M19 5 5 19" /></Svg>;
        case 'ShieldCheck':
            return <Svg><path d="M12 3 5 6v6c0 4.5 2.6 7.8 7 9 4.4-1.2 7-4.5 7-9V6Z" /><path d="m9.5 12 1.8 1.8L15 10.5" /></Svg>;
        case 'ArrowRight':
            return <Svg><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></Svg>;
        case 'CalendarClock':
            return <Svg><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 9h18" /><path d="M8 3v4" /><path d="M16 3v4" /><path d="M12 13v3l2 1" /><circle cx="12" cy="15" r="4" /></Svg>;
        case 'MapPinned':
            return <Svg><path d="M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z" /><circle cx="12" cy="10" r="2.2" /></Svg>;
        case 'Building2':
            return <Svg><path d="M4 21V7l8-3 8 3v14" /><path d="M9 21v-4h6v4" /><path d="M8 10h.01" /><path d="M12 10h.01" /><path d="M16 10h.01" /><path d="M8 13h.01" /><path d="M12 13h.01" /><path d="M16 13h.01" /></Svg>;
        case 'ExternalLink':
            return <Svg><path d="M14 5h5v5" /><path d="m10 14 9-9" /><path d="M19 14v5H5V5h5" /></Svg>;
        case 'Clock3':
            return <Svg><circle cx="12" cy="12" r="8" /><path d="M12 8v5l3 2" /></Svg>;
        case 'Sparkles':
            return <Svg><path d="m12 3 1.4 4.1L17.5 8.5l-4.1 1.4L12 14l-1.4-4.1L6.5 8.5l4.1-1.4Z" /><path d="m18.5 14.5.7 2.1 2.1.7-2.1.7-.7 2.1-.7-2.1-2.1-.7 2.1-.7Z" /><path d="m5.5 14.5.9 2.7 2.7.9-2.7.9-.9 2.7-.9-2.7-2.7-.9 2.7-.9Z" /></Svg>;
        case 'Filter':
            return <Svg><path d="M4 6h16" /><path d="M7 12h10" /><path d="M10 18h4" /></Svg>;
        case 'Languages':
            return <Svg><path d="M4 6h10" /><path d="M9 4c0 6-2.5 10-5 12" /><path d="M7 11h6" /><path d="m15 18 3-8 3 8" /><path d="M16 16h4" /></Svg>;
        case 'Moon':
            return <Svg><path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5Z" /></Svg>;
        case 'Sun':
            return <Svg><circle cx="12" cy="12" r="4" /><path d="M12 2v3" /><path d="M12 19v3" /><path d="m4.9 4.9 2.1 2.1" /><path d="m17 17 2.1 2.1" /><path d="M2 12h3" /><path d="M19 12h3" /><path d="m4.9 19.1 2.1-2.1" /><path d="m17 7 2.1-2.1" /></Svg>;
        default:
            return null;
    }
}
