import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageLevel } from "@/types/models/LanguageLevel";
import { act } from "@testing-library/react";
import { useUserStore } from "./useUserStore";

vi.mock("@/api/queries/getUserAITokens", () => ({
  getUserAITokens: vi.fn(),
}));

vi.mock("@/api/mutations/createUserAIToken", () => ({
  createUserAIToken: vi.fn(),
}));

vi.mock("@/api/mutations/deleteUserAIToken", () => ({
  deleteUserAIToken: vi.fn(),
}));

describe("useUserStore", () => {
  beforeEach(() => {
    act(() => {
      useUserStore.setState({
        user: null,
        userLanguages: [],
        aiTokens: [],
        isLoading: false,
        nativeLanguageCode: null,
      });
    });
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts with null user", () => {
      const state = useUserStore.getState();
      expect(state.user).toBe(null);
    });

    it("starts with empty userLanguages", () => {
      const state = useUserStore.getState();
      expect(state.userLanguages).toEqual([]);
    });

    it("starts with empty aiTokens", () => {
      const state = useUserStore.getState();
      expect(state.aiTokens).toEqual([]);
    });

    it("starts with isLoading false", () => {
      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("setUser", () => {
    it("sets the user", () => {
      const testUser = {
        id: "123",
        email: "test@test.com",
        name: "Test",
        surname: "User",
        role: "USER",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      act(() => {
        useUserStore.getState().setUser(testUser);
      });

      const state = useUserStore.getState();
      expect(state.user).toEqual(testUser);
    });

    it("clears the user when null is passed", () => {
      act(() => {
        useUserStore.getState().setUser({
          id: "123",
          email: "test@test.com",
          name: "Test",
          surname: "User",
          role: "USER",
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        });
      });

      act(() => {
        useUserStore.getState().setUser(null);
      });

      const state = useUserStore.getState();
      expect(state.user).toBe(null);
    });
  });

  describe("setUserLanguages", () => {
    it("sets user languages", () => {
      const languages = [
        {
          id: "lang-1",
          userId: "user-1",
          languageId: "en-id",
          createdAt: "2024-01-01T00:00:00Z",
          updatedAt: "2024-01-01T00:00:00Z",
          level: LanguageLevel.B2,
          isStarted: true,
          isNative: false,
        },
      ];

      act(() => {
        useUserStore.getState().setUserLanguages(languages);
      });

      const state = useUserStore.getState();
      expect(state.userLanguages).toEqual(languages);
    });
  });

  describe("setNativeLanguageCode", () => {
    it("sets native language code", () => {
      act(() => {
        useUserStore.getState().setNativeLanguageCode("en");
      });

      const state = useUserStore.getState();
      expect(state.nativeLanguageCode).toBe("en");
    });
  });

  describe("setLoading", () => {
    it("sets loading state", () => {
      act(() => {
        useUserStore.getState().setLoading(true);
      });

      expect(useUserStore.getState().isLoading).toBe(true);

      act(() => {
        useUserStore.getState().setLoading(false);
      });

      expect(useUserStore.getState().isLoading).toBe(false);
    });
  });

  describe("fetchAITokens", () => {
    it("fetches and stores AI tokens", async () => {
      const { getUserAITokens } = await import("@/api/queries/getUserAITokens");
      const mockTokens = [
        {
          id: "token-1",
          userId: "user-1",
          token: "sk-xxx",
          aiProviderId: "provider-1",
          isDefault: true,
          createdAt: "2024-01-01",
          updatedAt: "2024-01-01",
        },
      ];

      vi.mocked(getUserAITokens).mockResolvedValue(mockTokens);

      await act(async () => {
        await useUserStore.getState().fetchAITokens();
      });

      const state = useUserStore.getState();
      expect(state.aiTokens).toEqual(mockTokens);
      expect(state.isLoading).toBe(false);
    });

    it("handles fetch error gracefully", async () => {
      const { getUserAITokens } = await import("@/api/queries/getUserAITokens");
      vi.mocked(getUserAITokens).mockRejectedValue(new Error("Network error"));

      await act(async () => {
        await useUserStore.getState().fetchAITokens();
      });

      const state = useUserStore.getState();
      expect(state.isLoading).toBe(false);
    });
  });

  describe("addAIToken", () => {
    it("adds a new AI token", async () => {
      const { createUserAIToken } =
        await import("@/api/mutations/createUserAIToken");
      const newToken = {
        id: "token-2",
        userId: "user-1",
        token: "sk-yyy",
        aiProviderId: "provider-2",
        isDefault: false,
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      };

      vi.mocked(createUserAIToken).mockResolvedValue(newToken);

      await act(async () => {
        await useUserStore
          .getState()
          .addAIToken({ token: "sk-yyy", aiProviderId: "provider-2" });
      });

      const state = useUserStore.getState();
      expect(state.aiTokens).toContainEqual(newToken);
    });
  });

  describe("removeAIToken", () => {
    it("removes an AI token by id", async () => {
      const { deleteUserAIToken } =
        await import("@/api/mutations/deleteUserAIToken");
      vi.mocked(deleteUserAIToken).mockResolvedValue(undefined);

      act(() => {
        useUserStore.setState({
          aiTokens: [
            {
              id: "token-1",
              userId: "user-1",
              token: "sk-xxx",
              aiProviderId: "provider-1",
              isDefault: true,
              createdAt: "2024-01-01",
              updatedAt: "2024-01-01",
            },
            {
              id: "token-2",
              userId: "user-1",
              token: "sk-yyy",
              aiProviderId: "provider-2",
              isDefault: false,
              createdAt: "2024-01-01",
              updatedAt: "2024-01-01",
            },
          ],
        });
      });

      await act(async () => {
        await useUserStore.getState().removeAIToken("token-1");
      });

      const state = useUserStore.getState();
      expect(state.aiTokens).toHaveLength(1);
      expect(state.aiTokens[0].id).toBe("token-2");
    });
  });
});
