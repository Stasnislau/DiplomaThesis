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
  // Sticky-dismiss flag: once the user closes the prompt this session,
  // don't re-pop it on every navigation. Reset implicitly the next
  // time the page is fully reloaded (sessionStorage scope).
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

  // If the user actually adds a token, allow the prompt to come back
  // in a future session (clear the dismiss flag).
  useEffect(() => {
    if ((aiTokens?.length || 0) > 0) {
      try {
        sessionStorage.removeItem(DISMISSED_KEY);
      } catch {
        /* private mode / disabled storage — fine */
      }
    }
  }, [aiTokens?.length]);

  const dismissModal = () => {
    setTokenModalOpen(false);
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      /* private mode — fall back to in-memory dismiss only */
    }
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
        // X / backdrop click: just close. The user shouldn't be
        // teleported to /settings/ai-tokens against their will —
        // dismissing means "I'll handle it later."
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
