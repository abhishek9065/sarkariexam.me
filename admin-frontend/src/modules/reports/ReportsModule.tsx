import { useQuery } from '@tanstack/react-query';

import { OpsCard, OpsErrorState, OpsTable } from '../../components/ops';
import { ModuleScaffold } from '../../components/workspace';
import { getAdminReports } from '../../lib/api/client';

export function ReportsModule() {
    const query = useQuery({
        queryKey: ['admin-reports'],
        queryFn: () => getAdminReports(),
    });

    const report = query.data;

    return (
        <ModuleScaffold
            eyebrow="Monitoring"
            title="Reports"
            description="Broken links, deadlines, drafts, queue health, and top-viewed posts."
            meta={report ? <span>Latest operational reporting snapshot is loaded.</span> : undefined}
            headerActions={(
                <button type="button" className="admin-btn subtle" onClick={() => void query.refetch()}>
                    Refresh
                </button>
            )}
            metrics={report ? [
                { key: 'report-total-posts', label: 'Total Posts', value: report.summary.totalPosts },
                { key: 'report-pending-drafts', label: 'Pending Drafts', value: report.summary.pendingDrafts, tone: report.summary.pendingDrafts > 0 ? 'warning' : 'neutral' },
                { key: 'report-scheduled', label: 'Scheduled', value: report.summary.scheduled },
                { key: 'report-pending-review', label: 'Pending Review', value: report.summary.pendingReview, tone: report.summary.pendingReview > 0 ? 'warning' : 'neutral' },
                { key: 'report-broken-links', label: 'Broken Links', value: report.summary.brokenLinks, tone: report.summary.brokenLinks > 0 ? 'danger' : 'neutral' },
                { key: 'report-expired', label: 'Expired Posts', value: report.summary.expired },
            ] : undefined}
        >
            <div className="ops-stack">
                {query.isPending ? <div className="admin-alert info">Loading reports...</div> : null}
                {query.error ? <OpsErrorState message="Failed to load reports." /> : null}

                {report ? (
                    <>
                        {report.summary.totalPosts === 0 && report.summary.pendingDrafts === 0 && report.summary.scheduled === 0 && report.summary.brokenLinks === 0 ? (
                            <div className="admin-alert warning">Reports data appears empty. This usually means the analytics:read permission is missing or the reports API returned fallback values. Verify permission grants in the admin role configuration.</div>
                        ) : null}

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
            </div>
        </ModuleScaffold>
    );
}
