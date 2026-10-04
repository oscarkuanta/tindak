import { createBrowserRouter } from 'react-router';
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
import { ComingSoonPage } from '../pages/placeholders/ComingSoonPage.jsx';
import { RolePlaceholderPage } from '../pages/placeholders/RolePlaceholderPage.jsx';

export const routes = [
  {
    element: <ToastProvider />,
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
              { path: '/board-diikuti', element: <ComingSoonPage title="Board Diikuti" /> },
              {
                element: <RequireAuth />,
                children: [
                  { path: '/profil', element: <ProfilePage /> },
                  { path: '/board-saya', element: <MyBoardsPage /> },
                  { path: '/buat-board', element: <CreateBoardPage /> },
                  {
                    path: '/verifikasi-board',
                    element: (
                      <RolePlaceholderPage title="Verifikasi Board" requiredRole="BOARD_ADMIN" />
                    ),
                  },
                  {
                    path: '/panel-admin',
                    element: <RolePlaceholderPage title="Panel Admin" requiredRole="ADMIN" />,
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
              { path: '/b/:slug/pengaturan', element: <BoardSettingsPage /> },
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
