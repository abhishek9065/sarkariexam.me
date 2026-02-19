import { lazy, Suspense } from 'react';
import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AdminAuthProvider } from '../app/AdminAuthProvider';
import { AdminLayout } from '../app/AdminLayout';
import { AdminPreferencesProvider } from '../app/AdminPreferencesContext';
import { DesktopOnlyGate } from '../app/DesktopOnlyGate';
import { RequireAdminAuth } from '../app/RequireAdminAuth';
import { OpsSkeleton } from '../components/ops';
import { AdminNotificationsProvider, ConfirmDialogProvider } from '../components/ops/legacy-port';
import { isAdminModuleEnabled, type AdminModuleKey } from '../config/adminModules';
import { ModulePlaceholder } from './ModulePlaceholder';

const AdminLoginPage = lazy(() => import('./AdminLoginPage').then((module) => ({ default: module.AdminLoginPage })));
const DashboardPage = lazy(() => import('./DashboardPage').then((module) => ({ default: module.DashboardPage })));
const CreatePostModule = lazy(() => import('../modules/create-post/CreatePostModule').then((module) => ({ default: module.CreatePostModule })));
const ManagePostsModule = lazy(() => import('../modules/manage-posts/ManagePostsModule').then((module) => ({ default: module.ManagePostsModule })));
const ContentTypeListModule = lazy(() => import('../modules/content-type/ContentTypeListModule').then((module) => ({ default: module.ContentTypeListModule })));
const HomepageSectionsModule = lazy(() => import('../modules/homepage-sections/HomepageSectionsModule').then((module) => ({ default: module.HomepageSectionsModule })));
const LinkManagerModule = lazy(() => import('../modules/link-manager/LinkManagerModule').then((module) => ({ default: module.LinkManagerModule })));
const TemplatesModule = lazy(() => import('../modules/templates/TemplatesModule').then((module) => ({ default: module.TemplatesModule })));
const AlertsModule = lazy(() => import('../modules/alerts/AlertsModule').then((module) => ({ default: module.AlertsModule })));
const MediaPdfsModule = lazy(() => import('../modules/media-pdfs/MediaPdfsModule').then((module) => ({ default: module.MediaPdfsModule })));
const SeoToolsModule = lazy(() => import('../modules/seo-tools/SeoToolsModule').then((module) => ({ default: module.SeoToolsModule })));
const UsersRolesModule = lazy(() => import('../modules/users-roles/UsersRolesModule').then((module) => ({ default: module.UsersRolesModule })));
const ReportsModule = lazy(() => import('../modules/reports/ReportsModule').then((module) => ({ default: module.ReportsModule })));
const SettingsModule = lazy(() => import('../modules/settings/SettingsModule').then((module) => ({ default: module.SettingsModule })));
const ReviewModule = lazy(() => import('../modules/review/ReviewModule').then((module) => ({ default: module.ReviewModule })));
const BulkImportModule = lazy(() => import('../modules/bulk-import/BulkImportModule').then((module) => ({ default: module.BulkImportModule })));
const SessionsModule = lazy(() => import('../modules/sessions/SessionsModule').then((module) => ({ default: module.SessionsModule })));
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
                        <DesktopOnlyGate>
                            <Routes>
                                <Route
                                    path="/login"
                                    element={(
                                        <Suspense fallback={<OpsSkeleton lines={2} />}>
                                            <AdminLoginPage />
                                        </Suspense>
                                    )}
                                />

                                <Route element={<RequireAdminAuth />}>
                                    <Route element={<AdminLayout />}>
                                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                                        <Route path="/dashboard" element={gatedModule('dashboard', 'Dashboard', 'Operations metrics and quick actions.', <DashboardPage />)} />
                                        <Route path="/create-post" element={gatedModule('create-post', 'Create Post', 'Unified post creation wizard.', <CreatePostModule />)} />
                                        <Route path="/job" element={gatedModule('job', 'Job', 'Recruitment workflow and vacancy management.', <ContentTypeListModule type="job" title="Jobs / Recruitment" description="Create and manage recruitment posts with timelines and qualification details." />)} />
                                        <Route path="/result" element={gatedModule('result', 'Result', 'Result publication module.', <ContentTypeListModule type="result" title="Results" description="Publish exam results, links, and optional cutoff references." />)} />
                                        <Route path="/admit-card" element={gatedModule('admit-card', 'Admit Card', 'Admit card distribution module.', <ContentTypeListModule type="admit-card" title="Admit Card" description="Manage exam dates, release dates, and download links." />)} />
                                        <Route path="/answer-key" element={gatedModule('answer-key', 'Answer Key', 'Answer key and objection windows.', <ContentTypeListModule type="answer-key" title="Answer Key" description="Publish answer keys and objection window details." />)} />
                                        <Route path="/syllabus" element={gatedModule('syllabus', 'Syllabus', 'Syllabus and exam-pattern content.', <ContentTypeListModule type="syllabus" title="Syllabus / Exam Pattern" description="Manage syllabus PDFs and marks breakdown entries." />)} />
                                        <Route path="/admission" element={gatedModule('admission', 'Admission', 'Admission/counselling updates.', <ContentTypeListModule type="admission" title="Admissions" description="Manage admission posts, counselling timeline, and links." />)} />
                                        <Route path="/manage-posts" element={gatedModule('manage-posts', 'Manage Posts', 'Cross-type post management table.', <ManagePostsModule />)} />
                                        <Route path="/homepage-sections" element={gatedModule('homepage-sections', 'Homepage Sections', 'Section ranking and highlights.', <HomepageSectionsModule />)} />
                                        <Route path="/link-manager" element={gatedModule('link-manager', 'Link Manager', 'Link records, checks and replace flow.', <LinkManagerModule />)} />
                                        <Route path="/templates" element={gatedModule('templates', 'Templates', 'Shared posting templates and section snippets.', <TemplatesModule />)} />
                                        <Route path="/alerts" element={gatedModule('alerts', 'Alerts', 'Operational alert feed and triage controls.', <AlertsModule />)} />
                                        <Route path="/media-pdfs" element={gatedModule('media-pdfs', 'Media / PDFs', 'Media and PDF reference manager.', <MediaPdfsModule />)} />
                                        <Route path="/seo-tools" element={gatedModule('seo-tools', 'SEO Tools', 'Meta/schema and canonical controls.', <SeoToolsModule />)} />
                                        <Route path="/users-roles" element={gatedModule('users-roles', 'Users & Roles', 'Role governance and admin roster.', <UsersRolesModule />)} />
                                        <Route path="/reports" element={gatedModule('reports', 'Reports', 'Broken links, traffic, and deadline reports.', <ReportsModule />)} />
                                        <Route path="/settings" element={gatedModule('settings', 'Settings', 'States, boards, tags and site settings.', <SettingsModule />)} />

                                        {/* Backward-compatible aliases for existing tests/workflows */}
                                        <Route path="/announcements" element={gatedModule('manage-posts', 'Manage Posts', 'Cross-type post management table.', <ManagePostsModule />)} />
                                        <Route path="/review" element={<Suspense fallback={<OpsSkeleton lines={3} />}><ReviewModule /></Suspense>} />
                                        <Route path="/bulk" element={<Suspense fallback={<OpsSkeleton lines={3} />}><BulkImportModule /></Suspense>} />
                                        <Route path="/sessions" element={<Suspense fallback={<OpsSkeleton lines={3} />}><SessionsModule /></Suspense>} />
                                        <Route path="/approvals" element={<Suspense fallback={<OpsSkeleton lines={3} />}><ApprovalsModule /></Suspense>} />
                                    </Route>
                                </Route>

                                <Route path="*" element={<Navigate to="/dashboard" replace />} />
                            </Routes>
                        </DesktopOnlyGate>
                    </ConfirmDialogProvider>
                </AdminNotificationsProvider>
            </AdminPreferencesProvider>
        </AdminAuthProvider>
    );
}
