import { Navigate, createBrowserRouter } from 'react-router';
import { AUTH_PATHS } from '@tindak/shared';
import { AppLayout } from './layouts/AppLayout.jsx';
import { BoardLayout } from './layouts/BoardLayout.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { ToastProvider } from '../features/boards/ToastProvider.jsx';
import { LoginPromptProvider } from '../features/auth/LoginPromptProvider.jsx';
import { RequireAuth } from '../features/auth/RequireAuth.jsx';
import { GuestOnly } from '../features/auth/GuestOnly.jsx';
import { HomePage } from '../pages/home/HomePage.jsx';
import { LoginPage } from '../pages/login/LoginPage.jsx';
import { RegisterPage } from '../pages/register/RegisterPage.jsx';
import { ProfilePage } from '../pages/profile/ProfilePage.jsx';
import { MyBoardsPage } from '../pages/my-boards/MyBoardsPage.jsx';
import { NotFoundPage } from '../pages/not-found/NotFoundPage.jsx';
import { CreateBoardPage } from '../pages/create-board/CreateBoardPage.jsx';
import { SearchBoardsPage } from '../pages/search-boards/SearchBoardsPage.jsx';
import { BoardDetailPage } from '../pages/board-detail/BoardDetailPage.jsx';
import { BoardSettingsPage } from '../pages/board-settings/BoardSettingsPage.jsx';
import { FollowedBoardsPage } from '../pages/followed-boards/FollowedBoardsPage.jsx';
import { InvitationsPage } from '../pages/invitations/InvitationsPage.jsx';
import { BoardQueuePage } from '../pages/board-queue/BoardQueuePage.jsx';
import { ReportBoardPickerPage } from '../pages/create-report/ReportBoardPickerPage.jsx';
import { DeviceReportsPage } from '../pages/device-reports/DeviceReportsPage.jsx';
import { MyReportsPage } from '../pages/my-reports/MyReportsPage.jsx';
import { ReportDetailPage } from '../pages/report-detail/ReportDetailPage.jsx';
import { ReportSuccessPage } from '../pages/report-success/ReportSuccessPage.jsx';
import { TrackReportPage } from '../pages/track-report/TrackReportPage.jsx';
import { ReportFormPage } from '../pages/create-report/ReportFormPage.jsx';
import { AdminLayout } from '../pages/admin/AdminLayout.jsx';
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage.jsx';
import { ModerationQueuePage } from '../pages/admin/ModerationQueuePage.jsx';
import { BansPage } from '../pages/admin/BansPage.jsx';
import { AdminBoardsPage } from '../pages/admin/AdminBoardsPage.jsx';
import { AdminUsersPage } from '../pages/admin/AdminUsersPage.jsx';
import { AuditLogPage } from '../pages/admin/AuditLogPage.jsx';
import { VerificationLayout } from '../pages/verification/VerificationLayout.jsx';
import { VerificationDashboardPage } from '../pages/verification/VerificationDashboardPage.jsx';
import { VerificationDetailPage } from '../pages/verification/VerificationDetailPage.jsx';
import { RealtimeProvider } from '../features/realtime/RealtimeProvider.jsx';
import { NotificationsPage } from '../pages/notifications/NotificationsPage.jsx';

export const routes = [
  {
    element: <ToastProvider />,
    children: [
      {
        element: <RealtimeProvider />,
        children: [
          {
            element: <LoginPromptProvider />,
            children: [
              {
                element: <GuestOnly />,
                children: [
                  {
                    element: <AuthLayout />,
                    children: [
                      { path: AUTH_PATHS.LOGIN, element: <LoginPage /> },
                      { path: AUTH_PATHS.REGISTER, element: <RegisterPage /> },
                    ],
                  },
                ],
              },
              {
                element: <AppLayout />,
                children: [
                  { index: true, element: <HomePage /> },
                  { path: '/cari', element: <SearchBoardsPage /> },
                  { path: '/lapor', element: <ReportBoardPickerPage /> },
                  { path: '/laporan-terkirim', element: <ReportSuccessPage /> },
                  { path: '/laporan-perangkat-ini', element: <DeviceReportsPage /> },
                  { path: '/lacak', element: <TrackReportPage /> },
                  { path: '/lacak/:code', element: <TrackReportPage /> },
                  { path: '/laporan/:id', element: <ReportDetailPage /> },
                  {
                    element: <RequireAuth />,
                    children: [
                      { path: '/profil', element: <ProfilePage /> },
                      { path: '/notifikasi', element: <NotificationsPage /> },
                      { path: '/board-saya', element: <MyBoardsPage /> },
                      { path: '/board-diikuti', element: <FollowedBoardsPage /> },
                      { path: '/undangan', element: <InvitationsPage /> },
                      { path: '/laporan-saya', element: <MyReportsPage /> },
                      { path: '/buat-board', element: <CreateBoardPage /> },
                      { path: '/verifikasi-board', element: <Navigate to="/verifikasi" replace /> },
                      {
                        path: '/verifikasi',
                        element: <VerificationLayout />,
                        children: [
                          { index: true, element: <VerificationDashboardPage /> },
                          { path: ':slug', element: <VerificationDetailPage /> },
                        ],
                      },
                      { path: '/panel-admin', element: <Navigate to="/admin" replace /> },
                      {
                        path: '/admin',
                        element: <AdminLayout />,
                        children: [
                          { index: true, element: <AdminDashboardPage /> },
                          { path: 'moderasi', element: <ModerationQueuePage /> },
                          { path: 'ban', element: <BansPage /> },
                          { path: 'board', element: <AdminBoardsPage /> },
                          { path: 'user', element: <AdminUsersPage /> },
                          { path: 'audit', element: <AuditLogPage /> },
                        ],
                      },
                    ],
                  },
                  { path: '*', element: <NotFoundPage /> },
                ],
              },
              {
                element: <BoardLayout />,
                children: [
                  { path: '/b/:slug', element: <BoardDetailPage /> },
                  {
                    path: '/b/:slug/antrean',
                    element: (
                      <RequireAuth>
                        <BoardQueuePage />
                      </RequireAuth>
                    ),
                  },
                  { path: '/b/:slug/lapor', element: <ReportFormPage /> },
                  { path: '/b/:slug/pengaturan', element: <BoardSettingsPage /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
