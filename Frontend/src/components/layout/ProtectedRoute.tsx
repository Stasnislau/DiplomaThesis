import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import LoadingPage from "./Loading";
import { useEffect, useMemo, useState } from "react";
import { useUserStore } from "@/store/useUserStore";
import { useMe } from "@/api/hooks/useMe";
import { useGetUserAITokens } from "@/api/hooks/useGetUserAITokens";
import { Modal } from "../common/Modal";
import Button from "../common/Button";

interface ProtectedRouteProps {
  children: React.ReactNode;
  accessLevel?: "ADMIN" | "USER";
}

function ProtectedRoute({ children, accessLevel }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const userStore = useUserStore();
  const { me, isFetching: isMeFetching } = useMe();
  const { data: aiTokens, isLoading: isTokensLoading } = useGetUserAITokens();
  const [isTokenModalOpen, setTokenModalOpen] = useState(false);

  const shouldShowTokenModal = useMemo(() => {
    if (!isAuthenticated || isTokensLoading) return false;
    if (location.pathname === "/settings/ai-tokens") return false;
    return (aiTokens?.length || 0) === 0;
  }, [aiTokens?.length, isAuthenticated, isTokensLoading, location.pathname]);

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

  useEffect(() => {
    setTokenModalOpen(shouldShowTokenModal);
  }, [shouldShowTokenModal]);

  if (isLoading) {
    return <LoadingPage />;
  }

  return isAuthenticated &&
    (accessLevel === "ADMIN" ? userRole === "ADMIN" : true) ? (
    <>
      {children}
      <Modal
        isOpen={isTokenModalOpen}
        onClose={() => {
          setTokenModalOpen(false);
          navigate("/settings/ai-tokens");
        }}
        title="Add your AI token"
        description="To generate tasks and analyses, add at least one AI provider token."
      >
        <div className="mt-4 flex justify-end">
          <Button
            variant="primary"
            onClick={() => {
              setTokenModalOpen(false);
              navigate("/settings/ai-tokens");
            }}
          >
            Go to configuration
          </Button>
        </div>
      </Modal>
    </>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
}

export default ProtectedRoute;
