import { createBrowserRouter } from 'react-router';
import { AUTH_PATHS } from '@tindak/shared';
import { AppLayout } from './layouts/AppLayout.jsx';
import { AuthLayout } from './layouts/AuthLayout.jsx';
import { LoginPromptProvider } from '../features/auth/LoginPromptProvider.jsx';
import { RequireAuth } from '../features/auth/RequireAuth.jsx';
import { GuestOnly } from '../features/auth/GuestOnly.jsx';
import { HomePage } from '../pages/home/HomePage.jsx';
import { LoginPage } from '../pages/login/LoginPage.jsx';
import { RegisterPage } from '../pages/register/RegisterPage.jsx';
import { ProfilePage } from '../pages/profile/ProfilePage.jsx';
import { MyBoardsPage } from '../pages/my-boards/MyBoardsPage.jsx';
import { NotFoundPage } from '../pages/not-found/NotFoundPage.jsx';

export const routes = [
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
          {
            element: <RequireAuth />,
            children: [
              { path: '/profil', element: <ProfilePage /> },
              { path: '/board-saya', element: <MyBoardsPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];

export function createAppRouter() {
  return createBrowserRouter(routes);
}
