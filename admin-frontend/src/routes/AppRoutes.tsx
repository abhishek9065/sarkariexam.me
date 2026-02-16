import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminAuthProvider } from '../app/AdminAuthProvider';
import { AdminLayout } from '../app/AdminLayout';
import { RequireAdminAuth } from '../app/RequireAdminAuth';
import { AdminLoginPage } from './AdminLoginPage';
import { DashboardPage } from './DashboardPage';
import { AnalyticsModule } from '../modules/analytics/AnalyticsModule';
import { AnnouncementsListModule } from '../modules/announcements-list/AnnouncementsListModule';
import { ReviewModule } from '../modules/review/ReviewModule';
import { QuickAddModule } from '../modules/quick-add/QuickAddModule';
import { DetailedPostModule } from '../modules/detailed-post/DetailedPostModule';
import { BulkImportModule } from '../modules/bulk-import/BulkImportModule';
import { QueueModule } from '../modules/queue/QueueModule';
import { SecurityModule } from '../modules/security/SecurityModule';
import { SessionsModule } from '../modules/sessions/SessionsModule';
import { AuditModule } from '../modules/audit/AuditModule';
import { CommunityModerationModule } from '../modules/community-moderation/CommunityModerationModule';
import { ErrorReportsModule } from '../modules/error-reports/ErrorReportsModule';
import { ApprovalsModule } from '../modules/approvals/ApprovalsModule';

export function AppRoutes() {
    return (
        <AdminAuthProvider>
            <Routes>
                <Route path="/login" element={<AdminLoginPage />} />

                <Route element={<RequireAdminAuth />}>
                    <Route element={<AdminLayout />}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<DashboardPage />} />
                        <Route path="/analytics" element={<AnalyticsModule />} />
                        <Route path="/announcements" element={<AnnouncementsListModule />} />
                        <Route path="/announcements/list" element={<AnnouncementsListModule />} />
                        <Route path="/review" element={<ReviewModule />} />
                        <Route path="/create" element={<QuickAddModule />} />
                        <Route path="/detailed" element={<DetailedPostModule />} />
                        <Route path="/bulk" element={<BulkImportModule />} />
                        <Route path="/queue" element={<QueueModule />} />
                        <Route path="/security" element={<SecurityModule />} />
                        <Route path="/sessions" element={<SessionsModule />} />
                        <Route path="/audit" element={<AuditModule />} />
                        <Route path="/community" element={<CommunityModerationModule />} />
                        <Route path="/errors" element={<ErrorReportsModule />} />
                        <Route path="/approvals" element={<ApprovalsModule />} />
                    </Route>
                </Route>

                <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
        </AdminAuthProvider>
    );
}
