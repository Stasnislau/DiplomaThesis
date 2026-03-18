import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Button from "../common/Button";
import LoadingPage from "./Loading";
import { Modal } from "../common/Modal";
import { useAuthStore } from "../../store/useAuthStore";
import { useGetUserAITokens } from "@/api/hooks/useGetUserAITokens";

interface ProtectedRouteProps {
  children: React.ReactNode;
  accessLevel?: "ADMIN" | "USER";
}

function ProtectedRoute({ children, accessLevel }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, userRole } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: aiTokens, isLoading: isTokensLoading } = useGetUserAITokens();
  const [isTokenModalOpen, setTokenModalOpen] = useState(false);

  const shouldShowTokenModal = useMemo(() => {
    if (!isAuthenticated || isTokensLoading) return false;
    if (location.pathname === "/settings/ai-tokens") return false;
    return (aiTokens?.length || 0) === 0;
  }, [aiTokens?.length, isAuthenticated, isTokensLoading, location.pathname]);

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
