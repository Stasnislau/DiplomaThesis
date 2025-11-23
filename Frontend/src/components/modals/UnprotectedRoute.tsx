import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import LoadingPage from "../layout/Loading";

interface UnprotectedRouteProps {
  children: React.ReactNode;
}

function UnprotectedRoute({ children }: UnprotectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) {
    return <LoadingPage />;
  }

  return !isAuthenticated ? <>{children}</> : <Navigate to="/" />;
}

export default UnprotectedRoute;
