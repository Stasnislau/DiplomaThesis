import { createBrowserRouter, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import ProtectedRoute from './components/layout/ProtectedRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    // element: <WithTopBar />,
    children: [
      {
        path: '/',
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        //   <Navigate to="/app-settings/users" />
        ),
      },
    ],
  },
]);
