import ProtectedRoute from "./components/layout/ProtectedRoute";
import { ROUTES } from "./constants/routes";
import { SuspenseWrapper } from "./components/common/SuspenseWrapper";
import UnprotectedRoute from "./components/modals/UnprotectedRoute";
import WithTopBar from "./components/layout/WithTopBar";
import { createBrowserRouter } from "react-router-dom";
import { lazy } from "react";

// Lazy load pages
const AITokensPage = lazy(() => import("./pages/User/AITokens"));
const AdminDashboardPage = lazy(() => import("./pages/Admin/AdminDashboardPage").then(module => ({ default: module.AdminDashboardPage })));
const LandingPage = lazy(() => import("./pages/Home/LandingPage").then(module => ({ default: module.LandingPage })));
const LoginPage = lazy(() => import("./processes/Auth/Pages/LoginPage").then(module => ({ default: module.LoginPage })));
const MaterialsPage = lazy(() => import("./pages/Materials/MaterialsPage").then(module => ({ default: module.MaterialsPage })));
const NotFoundPage = lazy(() => import("./components/layout/NotFoundPage"));
const PlacementTestPage = lazy(() => import("./processes/PlacementTest/pages/PlacementTestPage").then(module => ({ default: module.PlacementTestPage })));
const ProfilePage = lazy(() => import("./pages/User/Profile").then(module => ({ default: module.ProfilePage })));
const RegisterPage = lazy(() => import("./processes/Auth/Pages/RegisterPage").then(module => ({ default: module.RegisterPage })));
const ResetPasswordPage = lazy(() => import("./processes/Auth/Pages/ResetPasswordPage").then(module => ({ default: module.ResetPasswordPage })));
const RootPage = lazy(() => import("./pages/Home/RootPage").then(module => ({ default: module.RootPage })));
const SpeechAnalysisPage = lazy(() => import("./pages/SpeechAnalysis/SpeechAnalysisPage").then(module => ({ default: module.SpeechAnalysisPage })));
const LearningPathPage = lazy(() => import("./pages/LearningPath/LearningPathPage"));
const LessonPracticePage = lazy(() => import("./pages/LearningPath/LessonPracticePage"));
const TaskPage = lazy(() => import("./pages/Quiz/TaskPage").then(module => ({ default: module.TaskPage })));
const TasksPage = lazy(() => import("./pages/Tasks/TasksPage"));
const TemplatesPage = lazy(() => import("./pages/Materials/TemplatesPage"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <WithTopBar />,
    children: [
      {
        path: ROUTES.HOME,
        index: true,
        element: (
          <SuspenseWrapper>
            <RootPage />
          </SuspenseWrapper>
        ),
      },
      {
        path: ROUTES.WELCOME,
        element: (
          <UnprotectedRoute>
            <SuspenseWrapper>
              <LandingPage />
            </SuspenseWrapper>
          </UnprotectedRoute>
        ),
      },
      {
        path: ROUTES.MATERIALS,
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <MaterialsPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.MATERIALS_TEMPLATES,
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <TemplatesPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.PROFILE,
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <ProfilePage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.SPEECH_ANALYSIS,
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <SpeechAnalysisPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: "learning-path",
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <LearningPathPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: "lesson",
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <LessonPracticePage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.TASKS,
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <TasksPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
      {
        path: ROUTES.SETTINGS_AI_TOKENS,
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <AITokensPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTES.QUIZ,
    element: <WithTopBar />,
    children: [
      {
        path: "",
        element: (
          <ProtectedRoute>
            <SuspenseWrapper>
              <TaskPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTES.ADMIN,
    element: <WithTopBar />,
    children: [
      {
        path: "",
        element: (
          <ProtectedRoute accessLevel="ADMIN">
            <SuspenseWrapper>
              <AdminDashboardPage />
            </SuspenseWrapper>
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
            <SuspenseWrapper>
              <PlacementTestPage />
            </SuspenseWrapper>
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: "/",
    children: [
      {
        path: ROUTES.LOGIN,
        element: (
          <UnprotectedRoute>
            <SuspenseWrapper>
              <LoginPage />
            </SuspenseWrapper>
          </UnprotectedRoute>
        ),
      },
      {
        path: ROUTES.REGISTER,
        element: (
          <UnprotectedRoute>
            <SuspenseWrapper>
              <RegisterPage />
            </SuspenseWrapper>
          </UnprotectedRoute>
        ),
      },
      {
        path: ROUTES.RESET_PASSWORD,
        element: (
          <UnprotectedRoute>
            <SuspenseWrapper>
              <ResetPasswordPage />
            </SuspenseWrapper>
          </UnprotectedRoute>
        ),
      },
    ],
  },
  {
    path: "*",
    element: (
      <SuspenseWrapper>
        <NotFoundPage />
      </SuspenseWrapper>
    ),
  },
]);
