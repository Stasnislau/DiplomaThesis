import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Button from "../common/Button";
import LoadingPage from "./Loading";
import { Modal } from "../common/Modal";
import { useAuthStore } from "../../store/useAuthStore";
import { useGetUserAITokens } from "@/api/hooks/useGetUserAITokens";
import { useTranslation } from "react-i18next";

interface ProtectedRouteProps {
  children: React.ReactNode;
  accessLevel?: "ADMIN" | "USER";
}

const DISMISSED_KEY = "tokenModalDismissed";

function ProtectedRoute({ children, accessLevel }: ProtectedRouteProps) {
  const { t } = useTranslation();
  const { isAuthenticated, isLoading, userRole } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const { data: aiTokens, isLoading: isTokensLoading } = useGetUserAITokens();
  const [isTokenModalOpen, setTokenModalOpen] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  const shouldShowTokenModal = useMemo(() => {
    if (!isAuthenticated || isTokensLoading) return false;
    if (location.pathname === "/settings/ai-tokens") return false;
    if (dismissed) return false;
    return (aiTokens?.length || 0) === 0;
  }, [
    aiTokens?.length,
    isAuthenticated,
    isTokensLoading,
    location.pathname,
    dismissed,
  ]);

  useEffect(() => {
    setTokenModalOpen(shouldShowTokenModal);
  }, [shouldShowTokenModal]);

  useEffect(() => {
    if ((aiTokens?.length || 0) > 0) {
      try {
        sessionStorage.removeItem(DISMISSED_KEY);
      } catch { void 0; }
    }
  }, [aiTokens?.length]);

  const dismissModal = () => {
    setTokenModalOpen(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch { void 0; }
  };

  if (isLoading) {
    return <LoadingPage />;
  }

  return isAuthenticated &&
    (accessLevel === "ADMIN" ? userRole === "ADMIN" : true) ? (
    <>
      {children}
      <Modal
        isOpen={isTokenModalOpen}
        onClose={dismissModal}
        title={t("aiTokens.tokenModalTitle")}
        description={t("aiTokens.tokenModalBody")}
      >
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="tertiary" onClick={dismissModal}>
            {t("aiTokens.dismissForNow")}
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              dismissModal();
              navigate("/settings/ai-tokens");
            }}
          >
            {t("aiTokens.goToConfiguration")}
          </Button>
        </div>
      </Modal>
    </>
  ) : (
    <Navigate to="/login" state={{ from: location }} replace />
  );
}

export default ProtectedRoute;
