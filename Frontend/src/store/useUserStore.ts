import { create } from "zustand";
import { User } from "@/types/models/User";
import { Language } from "@/types/models/Language";
interface UserState {
  user: User | null;
  userLanguages: Language[];
  isLoading: boolean;
  nativeLanguageCode: string | null;
  setNativeLanguageCode: (nativeLanguageCode: string) => void;
  setUser: (user: User | null) => void;
  setUserLanguages: (userLanguages: Language[]) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useUserStore = create<UserState>((set) => ({
  user: null,
  userLanguages: [],
  isLoading: false,
  nativeLanguageCode: null,
  setNativeLanguageCode: (nativeLanguageCode) => set({ nativeLanguageCode }),
  setUser: (user) => set({ user }),
  setUserLanguages: (userLanguages) => set({ userLanguages }),
  setLoading: (isLoading) => set({ isLoading }),
}));
