import type { Announcement } from '../../../types';
import { AnnouncementListDense } from '../shared/AnnouncementListDense';

interface HomeDenseColumnsV3Props {
    jobs: Announcement[];
    results: Announcement[];
    admitCards: Announcement[];
    trackedSlugs?: Set<string>;
    onCompareAdd?: (item: Announcement) => void;
    onTrackToggle?: (item: Announcement) => void;
}

export function HomeDenseColumnsV3({
    jobs,
    results,
    admitCards,
    trackedSlugs,
    onCompareAdd,
    onTrackToggle,
}: HomeDenseColumnsV3Props) {
    return (
        <section className="sr3-section sr3-three-col">
            <AnnouncementListDense
                title="Latest Jobs"
                subtitle="Top active recruitments"
                items={jobs}
                limit={20}
                trackedSlugs={trackedSlugs}
                onTrackToggle={onTrackToggle}
                onCompareAdd={onCompareAdd}
                footerLink={{ label: 'View all jobs', to: '/jobs' }}
            />
            <AnnouncementListDense
                title="Admit Cards"
                subtitle="Recent hall-ticket releases"
                items={admitCards}
                limit={15}
                trackedSlugs={trackedSlugs}
                onTrackToggle={onTrackToggle}
                footerLink={{ label: 'View all admit cards', to: '/admit-card' }}
            />
            <AnnouncementListDense
                title="Results"
                subtitle="Fresh result declarations"
                items={results}
                limit={20}
                trackedSlugs={trackedSlugs}
                onTrackToggle={onTrackToggle}
                footerLink={{ label: 'View all results', to: '/results' }}
            />
        </section>
    );
}

export default HomeDenseColumnsV3;
