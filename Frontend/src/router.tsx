import { createBrowserRouter } from "react-router-dom";
import { HomePage } from "./pages/Home/HomePage";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import UnprotectedRoute from "./components/layout/UnprotectedRoute";
import WithTopBar from "./components/layout/WithTopBar";
import { LoginPage } from "./pages/Auth/LoginPage";
import { RegisterPage } from "./pages/Auth/RegisterPage";
import { ResetPasswordPage } from "./pages/Auth/ResetPasswordPage";
import NotFoundPage from "./components/layout/NotFoundPage";
import { TaskPage } from "./pages/Quiz/TaskPage";
import { ProfilePage } from "./pages/User/Profile";
import { PlacementTestPage } from "./pages/PlacementTest/PlacementTestPage";
import { PlacementResultPage } from "./pages/PlacementTest/PlacementResultPage";
import { AdminDashboardPage } from "./pages/Admin/AdminDashboardPage";

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
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/quiz",
    element: <WithTopBar />,
    children: [
      {
        path: "",
        element: (
          <ProtectedRoute>
            <TaskPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/admin",
    element: <WithTopBar />,
    children: [
      {
        path: "",
        element: (
          <ProtectedRoute>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/placement",
    children: [
      {
        path: "test/:languageCode",
        element: <PlacementTestPage />,
      },
      {
        path: "result/:languageCode",
        element: <PlacementResultPage />,
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
