import { create } from "zustand";
import { useMe } from "@/api/hooks/useMe";
import { User } from "@/types/models/User";
import { UserLanguage } from "@/api/hooks/useUserLanguages";

interface UserState {
  user: User | null;
  userLanguages: UserLanguage[];
  isLoading: boolean;
  error: Error | null;
  isInitialized: boolean;
  showLanguageModal: boolean;
  nativeLanguage: string | null;
  targetLanguage: string | null;
  
  // Actions
  setUser: (user: User | null) => void;
  setUserLanguages: (languages: UserLanguage[]) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: Error | null) => void;
  setInitialized: (isInitialized: boolean) => void;
  setShowLanguageModal: (show: boolean) => void;
  setNativeLanguage: (language: string) => void;
  setTargetLanguage: (language: string) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  userLanguages: [],
  isLoading: false,
  error: null,
  isInitialized: false,
  showLanguageModal: false,
  nativeLanguage: null,
  targetLanguage: null,
  
  // Actions
  setUser: (user) => set({ user }),
  setUserLanguages: (userLanguages) => set({ userLanguages }),
  setLoading: (isLoading) => set({ isLoading }),
  setError: (error) => set({ error }),
  setInitialized: (isInitialized) => set({ isInitialized }),
  setShowLanguageModal: (showLanguageModal) => set({ showLanguageModal }),
  setNativeLanguage: (nativeLanguage) => set({ nativeLanguage }),
  setTargetLanguage: (targetLanguage) => set({ targetLanguage }),
}));

// Hook to initialize and use the user store
export const useUserData = () => {
  const { me, isFetching, error } = useMe();
  const {
    setUser,
    setUserLanguages,
    setLoading,
    setError,
    setInitialized,
    setShowLanguageModal,
    user,
    userLanguages,
    isInitialized,
    showLanguageModal,
    nativeLanguage,
    targetLanguage,
    setNativeLanguage,
    setTargetLanguage,
  } = useUserStore();

  // Set user data when it's fetched
  if (me && !user) {
    setUser(me);
    setInitialized(true);
  }

  // Update loading state
  if (isFetching !== isInitialized) {
    setLoading(isFetching);
  }

  // Update error state
  if (error) {
    setError(error);
  }

  // Check if language modal should be shown
  if (isInitialized && me && userLanguages.length === 0 && !showLanguageModal) {
    setShowLanguageModal(true);
  }

  return {
    user,
    userLanguages,
    isLoading: isFetching,
    error,
    isInitialized,
    showLanguageModal,
    nativeLanguage,
    targetLanguage,
    setNativeLanguage,
    setTargetLanguage,
    setShowLanguageModal
  };
}; 