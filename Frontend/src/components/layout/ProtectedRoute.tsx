import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import LoadingPage from "./Loading";

interface ProtectedRouteProps {
  children: React.ReactNode;
  accessLevel?: "admin" | "user";
}

function ProtectedRoute({ children, accessLevel }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuthStore();
  const location = useLocation();

  if (isLoading) {
    return <LoadingPage />;
  }

  return isAuthenticated && (accessLevel === "admin" ? userRole === "ADMIN" : true) ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
}

export default ProtectedRoute;
