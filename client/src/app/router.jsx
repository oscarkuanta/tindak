import { createBrowserRouter } from 'react-router';
import { AppLayout } from './layouts/AppLayout.jsx';
import { HomePage } from '../pages/home/HomePage.jsx';
import { NotFoundPage } from '../pages/not-found/NotFoundPage.jsx';

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]);
