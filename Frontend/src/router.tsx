import { createBrowserRouter, Navigate } from "react-router-dom";
import { HomePage } from "./pages/HomePage";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import UnprotectedRoute from "./components/layout/UnprotectedRoute";
import WithTopBar from "./components/layout/WithTopBar";
import { LoginPage } from "./pages/Auth/LoginPage";
import { RegisterPage } from "./pages/Auth/RegisterPage";
import { ResetPasswordPage } from "./pages/Auth/ResetPasswordPage";
import NotFoundPage from "./components/layout/NotFoundPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <WithTopBar />,
    children: [
      {
        path: "/",
        index: true,
        element: (
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/",
    children: [
      {
        path: "/login",
        element: (
          <UnprotectedRoute>
            <LoginPage />
          </UnprotectedRoute>
        ),
      },
      {
        path: "/register",
        element: (
          <UnprotectedRoute>
            <RegisterPage />
          </UnprotectedRoute>
        ),
      },
      {
        path: "/reset-password",
        element: (
          <UnprotectedRoute>
            <ResetPasswordPage />
          </UnprotectedRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: <NotFoundPage />,
  },
]);
