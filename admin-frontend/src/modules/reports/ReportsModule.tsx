import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsErrorState, OpsTable } from '../../components/ops';
import { getAdminReports } from '../../lib/api/client';

export function ReportsModule() {
    const query = useQuery({
        queryKey: ['admin-reports'],
        queryFn: () => getAdminReports(),
    });

    const report = query.data;

    return (
        <OpsCard title="Reports" description="Broken links, deadlines, drafts, queue health and top-viewed posts.">
            {query.isPending ? <div className="admin-alert info">Loading reports...</div> : null}
            {query.error ? <OpsErrorState message="Failed to load reports." /> : null}

            {report ? (
                <>
                    <div className="ops-kpi-grid">
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Total Posts</div>
                            <div className="ops-kpi-value">{report.summary.totalPosts}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Pending Drafts</div>
                            <div className="ops-kpi-value">{report.summary.pendingDrafts}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Scheduled</div>
                            <div className="ops-kpi-value">{report.summary.scheduled}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Pending Review</div>
                            <div className="ops-kpi-value">{report.summary.pendingReview}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Broken Links</div>
                            <div className="ops-kpi-value">{report.summary.brokenLinks}</div>
                        </div>
                        <div className="ops-kpi-card">
                            <div className="ops-kpi-label">Expired Posts</div>
                            <div className="ops-kpi-value">{report.summary.expired}</div>
                        </div>
                    </div>

                    <OpsCard title="Most Viewed (24h)" description="Top traffic posts.">
                        <OpsTable
                            columns={[
                                { key: 'title', label: 'Title' },
                                { key: 'type', label: 'Type' },
                                { key: 'views', label: 'Views' },
                                { key: 'organization', label: 'Organization' },
                            ]}
                        >
                            {report.mostViewed24h.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.title}</td>
                                    <td>{item.type}</td>
                                    <td>{item.views}</td>
                                    <td>{item.organization || '-'}</td>
                                </tr>
                            ))}
                        </OpsTable>
                    </OpsCard>

                    <OpsCard title="Upcoming Deadlines" description="Application/exam timeline in next 7 days.">
                        <OpsTable
                            columns={[
                                { key: 'title', label: 'Title' },
                                { key: 'type', label: 'Type' },
                                { key: 'deadline', label: 'Deadline' },
                                { key: 'organization', label: 'Organization' },
                            ]}
                        >
                            {report.upcomingDeadlines.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.title}</td>
                                    <td>{item.type}</td>
                                    <td>{item.deadline ? new Date(item.deadline).toLocaleString() : '-'}</td>
                                    <td>{item.organization || '-'}</td>
                                </tr>
                            ))}
                        </OpsTable>
                    </OpsCard>

                    <OpsCard title="Broken Link Items" description="Known broken URLs requiring fixes.">
                        <OpsTable
                            columns={[
                                { key: 'label', label: 'Label' },
                                { key: 'url', label: 'URL' },
                                { key: 'announcementId', label: 'Announcement' },
                                { key: 'updatedAt', label: 'Updated' },
                            ]}
                        >
                            {report.brokenLinkItems.map((item) => (
                                <tr key={item.id}>
                                    <td>{item.label}</td>
                                    <td>{item.url}</td>
                                    <td>{item.announcementId || '-'}</td>
                                    <td>{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : '-'}</td>
                                </tr>
                            ))}
                        </OpsTable>
                    </OpsCard>
                </>
            ) : null}
        </OpsCard>
    );
}
