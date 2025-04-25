import React, { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { useUserStore } from "@/store/useUserStore";
import { useMe } from "@/api/hooks/useMe";
import LoadingPage from "./layout/Loading"; 
import { NoLanguagesModal } from "./modals/NoLanguagesModal";

interface HOCProps {
  children: React.ReactNode;
}

export const HOC: React.FC<HOCProps> = ({ children }) => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    initialized: authInitialized,
    refresh,
  } = useAuthStore();
  const { setUser, setLoading: setUserLoading, setUserLanguages } = useUserStore();
  const [hasAttemptedRefresh, setHasAttemptedRefresh] = useState(false);
  const [showLanguageModal, setShowLanguageModal] = useState(false);

  useEffect(() => {
    if (!authInitialized && !hasAttemptedRefresh) {
      setHasAttemptedRefresh(true);
      refresh();
    }
  }, [authInitialized, hasAttemptedRefresh, refresh]);

  const { 
    me: userDataPayload, 
    isLoading: userLoading, 
    isSuccess: userFetched, 
    error: userError 
  } = useMe({
    enabled: !!isAuthenticated && authInitialized, 
  });

  useEffect(() => {
    if (userFetched && userDataPayload) {
      setUser(userDataPayload);
      setUserLanguages(userDataPayload.languages || []);
      const hasNativeLanguage = userDataPayload.languages?.some(
        (lang) => lang.currentLevel === "NATIVE"
      );
      setShowLanguageModal(!hasNativeLanguage);
    } else if (!isAuthenticated && authInitialized) {
      setUser(null);
      setShowLanguageModal(false);
    } else if (userError) {
        console.error("HOC: Error fetching user data:", userError);
    }
  }, [userFetched, userDataPayload, setUser, isAuthenticated, authInitialized, userError]);

   useEffect(() => {
     setUserLoading(authLoading || (!!isAuthenticated && authInitialized && userLoading));
   }, [authLoading, userLoading, setUserLoading, isAuthenticated, authInitialized]);


  if (authLoading || !authInitialized || (isAuthenticated && !userFetched && !userError)) {
    return <LoadingPage />;
  }
  
  if (isAuthenticated && userFetched && showLanguageModal) {
    return <NoLanguagesModal />;
  }
  
  return <>{children}</>;
}; 