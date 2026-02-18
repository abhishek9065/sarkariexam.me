import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminAuthProvider } from '../app/AdminAuthProvider';
import { AdminLayout } from '../app/AdminLayout';
import { AdminPreferencesProvider } from '../app/AdminPreferencesContext';
import { RequireAdminAuth } from '../app/RequireAdminAuth';
import { OpsSkeleton } from '../components/ops';
import { AdminNotificationsProvider, ConfirmDialogProvider } from '../components/ops/legacy-port';
import { isAdminModuleEnabled, type AdminModuleKey } from '../config/adminModules';
import { ModulePlaceholder } from './ModulePlaceholder';

const AdminLoginPage = lazy(() => import('./AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));
const DashboardPage = lazy(() => import('./DashboardPage').then((module) => ({ default: module.DashboardPage })));
const AnalyticsModule = lazy(() => import('../modules/analytics/AnalyticsModule').then((module) => ({ default: module.AnalyticsModule })));
const AnnouncementsListModule = lazy(() => import('../modules/announcements-list/AnnouncementsListModule').then((module) => ({ default: module.AnnouncementsListModule })));
const ReviewModule = lazy(() => import('../modules/review/ReviewModule').then((module) => ({ default: module.ReviewModule })));
const QuickAddModule = lazy(() => import('../modules/quick-add/QuickAddModule').then((module) => ({ default: module.QuickAddModule })));
const DetailedPostModule = lazy(() => import('../modules/detailed-post/DetailedPostModule').then((module) => ({ default: module.DetailedPostModule })));
const BulkImportModule = lazy(() => import('../modules/bulk-import/BulkImportModule').then((module) => ({ default: module.BulkImportModule })));
const QueueModule = lazy(() => import('../modules/queue/QueueModule').then((module) => ({ default: module.QueueModule })));
const SecurityModule = lazy(() => import('../modules/security/SecurityModule').then((module) => ({ default: module.SecurityModule })));
const SessionsModule = lazy(() => import('../modules/sessions/SessionsModule').then((module) => ({ default: module.SessionsModule })));
const AuditModule = lazy(() => import('../modules/audit/AuditModule').then((module) => ({ default: module.AuditModule })));
const CommunityModerationModule = lazy(() => import('../modules/community-moderation/CommunityModerationModule').then((module) => ({ default: module.CommunityModerationModule })));
const ErrorReportsModule = lazy(() => import('../modules/error-reports/ErrorReportsModule').then((module) => ({ default: module.ErrorReportsModule })));
const ApprovalsModule = lazy(() => import('../modules/approvals/ApprovalsModule').then((module) => ({ default: module.ApprovalsModule })));

function gatedModule(
    key: AdminModuleKey,
    title: string,
    description: string,
    element: ReactNode
) {
    if (!isAdminModuleEnabled(key)) {
        return (
            <ModulePlaceholder
                title={`${title} is gated`}
                description={`${description} This module is currently disabled by VITE_ADMIN_VNEXT_MODULES.`}
            />
        );
    }

    return <Suspense fallback={<OpsSkeleton lines={3} />}>{element}</Suspense>;
}

export function AppRoutes() {
    return (
        <AdminAuthProvider>
            <AdminPreferencesProvider>
                <AdminNotificationsProvider>
                    <ConfirmDialogProvider>
                        <Routes>
                            <Route
                                path="/login"
                                element={
                                    <Suspense fallback={<OpsSkeleton lines={2} />}>
                                        <AdminLoginPage />
                                    </Suspense>
                                }
                            />

                            <Route element={<RequireAdminAuth />}>
                                <Route element={<AdminLayout />}>
                                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                    <Route
                                        path="/dashboard"
                                        element={gatedModule('dashboard', 'Dashboard', 'Operations metrics surface.', <DashboardPage />)}
                                    />
                                    <Route
                                        path="/analytics"
                                        element={gatedModule('analytics', 'Analytics', 'Summary analytics and trends.', <AnalyticsModule />)}
                                    />
                                    <Route
                                        path="/announcements"
                                        element={gatedModule('announcements', 'Announcements', 'Announcement listing and filtering.', <AnnouncementsListModule />)}
                                    />
                                    <Route
                                        path="/announcements/list"
                                        element={gatedModule('announcements', 'Announcements', 'Announcement listing and filtering.', <AnnouncementsListModule />)}
                                    />
                                    <Route
                                        path="/review"
                                        element={gatedModule('review', 'Review', 'Preview-first content review workflow.', <ReviewModule />)}
                                    />
                                    <Route
                                        path="/create"
                                        element={gatedModule('quick-add', 'Quick Add', 'Fast content posting flow.', <QuickAddModule />)}
                                    />
                                    <Route
                                        path="/detailed"
                                        element={gatedModule('detailed-post', 'Detailed Post', 'Deep edit controls for records.', <DetailedPostModule />)}
                                    />
                                    <Route
                                        path="/bulk"
                                        element={gatedModule('bulk-import', 'Bulk Import', 'Bulk updates with preview checks.', <BulkImportModule />)}
                                    />
                                    <Route
                                        path="/queue"
                                        element={gatedModule('queue', 'Queue', 'Pending publication queue.', <QueueModule />)}
                                    />
                                    <Route
                                        path="/security"
                                        element={gatedModule('security', 'Security', 'Security event visibility and triage.', <SecurityModule />)}
                                    />
                                    <Route
                                        path="/sessions"
                                        element={gatedModule('sessions', 'Sessions', 'Session management and termination.', <SessionsModule />)}
                                    />
                                    <Route
                                        path="/audit"
                                        element={gatedModule('audit', 'Audit', 'Audit event ledger and inspection.', <AuditModule />)}
                                    />
                                    <Route
                                        path="/community"
                                        element={gatedModule('community-moderation', 'Community', 'Community moderation workflows.', <CommunityModerationModule />)}
                                    />
                                    <Route
                                        path="/errors"
                                        element={gatedModule('error-reports', 'Errors', 'Client error report triage.', <ErrorReportsModule />)}
                                    />
                                    <Route
                                        path="/approvals"
                                        element={gatedModule('approvals', 'Approvals', 'Dual-control approvals queue.', <ApprovalsModule />)}
                                    />
                                </Route>
                            </Route>

                            <Route path="*" element={<Navigate to="/dashboard" replace />} />
                        </Routes>
                    </ConfirmDialogProvider>
                </AdminNotificationsProvider>
            </AdminPreferencesProvider>
        </AdminAuthProvider>
    );
}
