import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import LoadingPage from "./Loading";
import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useMe } from "@/api/hooks/useMe";

interface ProtectedRouteProps {
  children: React.ReactNode;
  accessLevel?: "admin" | "user";
}

function ProtectedRoute({ children, accessLevel }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuthStore();
  const location = useLocation();
  const userStore = useUserStore();
  const { me, isFetching: isMeFetching } = useMe();

  useEffect(() => {
    if (isAuthenticated && !isMeFetching) {
      if (me) {
        userStore.setUser({
          id: me.id,
          email: me.email,
          name: me.name,
          surname: me.surname,
          role: me.role,
          createdAt: me.createdAt,
          updatedAt: me.updatedAt,
        });
      }
      if (me?.languages?.length === 0) {
        userStore.setUserLanguages(me.languages);
      }
      
    }
  }, [isAuthenticated, me]);

  if (isLoading) {
    return <LoadingPage />;
  }

  return isAuthenticated &&
    (accessLevel === "admin" ? userRole === "ADMIN" : true) ? (
    <>{children}</>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
}

export default ProtectedRoute;
