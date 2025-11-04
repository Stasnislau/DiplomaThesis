import { create } from 'zustand';
import { User } from '@/types/models/User';
import { UserLanguage } from '@/types/models/Language';
import { getUserAITokens } from '@/api/queries/getUserAITokens';
import {
  createUserAIToken,
  CreateUserAITokenRequest,
} from '@/api/mutations/createUserAIToken';
import { deleteUserAIToken } from '@/api/mutations/deleteUserAIToken';
import { AiToken } from '@/types/models/AiToken';

interface UserState {
  user: User | null;
  userLanguages: UserLanguage[];
  aiTokens: AiToken[];
  isLoading: boolean;
  nativeLanguageCode: string | null;
  setNativeLanguageCode: (nativeLanguageCode: string) => void;
  setUser: (user: User | null) => void;
  setUserLanguages: (userLanguages: UserLanguage[]) => void;
  setLoading: (isLoading: boolean) => void;
  fetchAITokens: () => Promise<void>;
  addAIToken: (tokenData: CreateUserAITokenRequest) => Promise<void>;
  removeAIToken: (tokenId: string) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  userLanguages: [],
  aiTokens: [],
  isLoading: false,
  nativeLanguageCode: null,
  setNativeLanguageCode: (nativeLanguageCode) => set({ nativeLanguageCode }),
  setUser: (user) => set({ user }),
  setUserLanguages: (userLanguages) => set({ userLanguages }),
  setLoading: (isLoading) => set({ isLoading }),
  fetchAITokens: async () => {
    try {
      set({ isLoading: true });
      const tokens = await getUserAITokens();
      set({ aiTokens: tokens, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch AI tokens', error);
      set({ isLoading: false });
    }
  },
  addAIToken: async (tokenData) => {
    try {
      const newToken = await createUserAIToken(tokenData);
      set({ aiTokens: [...get().aiTokens, newToken] });
    } catch (error) {
      console.error('Failed to add AI token', error);
    }
  },
  removeAIToken: async (tokenId) => {
    try {
      await deleteUserAIToken(tokenId);
      set({
        aiTokens: get().aiTokens.filter((token) => token.id !== tokenId),
      });
    } catch (error) {
      console.error('Failed to remove AI token', error);
    }
  },
}));
