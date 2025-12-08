import { createBrowserRouter } from "react-router-dom";
import { RootPage } from "./pages/Home/RootPage";
import { LandingPage } from "./pages/Home/LandingPage";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import UnprotectedRoute from "./components/modals/UnprotectedRoute";
import WithTopBar from "./components/layout/WithTopBar";
import { LoginPage } from "./processes/Auth/Pages/LoginPage";
import { RegisterPage } from "./processes/Auth/Pages/RegisterPage";
import { ResetPasswordPage } from "./processes/Auth/Pages/ResetPasswordPage";
import NotFoundPage from "./components/layout/NotFoundPage";
import { TaskPage } from "./pages/Quiz/TaskPage";
import { ProfilePage } from "./pages/User/Profile";
import { PlacementTestPage } from "./processes/PlacementTest/pages/PlacementTestPage";
import { AdminDashboardPage } from "./pages/Admin/AdminDashboardPage";
import { SpeechAnalysisPage } from "./pages/SpeechAnalysis/SpeechAnalysisPage";
import TasksPage from "./pages/Tasks/TasksPage";
import AITokensPage from "./pages/User/AITokens";
import { MaterialsPage } from "./pages/Materials/MaterialsPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <WithTopBar />,
    children: [
      {
        path: "/",
        index: true,
        element: <RootPage />,
      },
      {
        path: "/welcome",
        element: (
          <UnprotectedRoute>
            <LandingPage />
          </UnprotectedRoute>
        ),
      },
      {
        path: "/materials",
        element: (
          <ProtectedRoute>
            <MaterialsPage />
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
      {
        path: "/speech-analysis",
        element: (
          <ProtectedRoute>
            <SpeechAnalysisPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/tasks",
        element: (
          <ProtectedRoute>
            <TasksPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "/settings/ai-tokens",
        element: (
          <ProtectedRoute>
            <AITokensPage />
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
          <ProtectedRoute accessLevel="ADMIN">
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/placement",
    element: <WithTopBar />,
    children: [
      {
        path: "test/:languageCode",
        element: (
          <ProtectedRoute>
            <PlacementTestPage />
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
