import { beforeEach, describe, expect, it, vi } from "vitest";

import { act } from "@testing-library/react";
import { useAuthStore } from "./useAuthStore";

// Mock the API modules
vi.mock("../api/mutations/login", () => ({
  login: vi.fn(),
}));

vi.mock("../api/mutations/logout", () => ({
  logout: vi.fn(),
}));

vi.mock("../api/mutations/refresh", () => ({
  refresh: vi.fn(),
}));

vi.mock("js-cookie", () => ({
  default: {
    set: vi.fn(),
    remove: vi.fn(),
    get: vi.fn(),
  },
}));

vi.mock("@/utils/getAccessToken", () => ({
  getAccessToken: vi.fn(),
}));

vi.mock("jwt-decode", () => ({
  jwtDecode: vi.fn(),
}));

describe("useAuthStore", () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useAuthStore.setState({
        isAuthenticated: false,
        isLoading: true,
        initialized: false,
        userRole: null,
      });
    });

    // Clear localStorage
    localStorage.clear();

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("initial state", () => {
    it("starts as not authenticated", () => {
      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
    });

    it("starts in loading state", () => {
      const state = useAuthStore.getState();
      expect(state.isLoading).toBe(true);
    });

    it("starts as not initialized", () => {
      const state = useAuthStore.getState();
      expect(state.initialized).toBe(false);
    });

    it("starts with null userRole", () => {
      const state = useAuthStore.getState();
      expect(state.userRole).toBe(null);
    });
  });

  describe("login", () => {
    it("sets isAuthenticated to true on successful login", async () => {
      const { login: apiLogin } = await import("../api/mutations/login");
      const { jwtDecode } = await import("jwt-decode");

      vi.mocked(apiLogin).mockResolvedValue({
        success: true,
        payload: {
          accessToken: "test-token",
          refreshToken: "refresh-token",
        },
        errors: [],
      });

      vi.mocked(jwtDecode).mockReturnValue({
        role: "user",
        sub: "123",
        email: "test@test.com",
        exp: Date.now() + 3600000,
        iat: Date.now(),
      });

      const { login } = useAuthStore.getState();

      await act(async () => {
        const result = await login({
          email: "test@test.com",
          password: "password",
        });
        expect(result.success).toBe(true);
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userRole).toBe("user");
    });

    it("stores access token in localStorage", async () => {
      const { login: apiLogin } = await import("../api/mutations/login");
      const { jwtDecode } = await import("jwt-decode");

      vi.mocked(apiLogin).mockResolvedValue({
        success: true,
        payload: {
          accessToken: "test-access-token",
          refreshToken: "refresh-token",
        },
        errors: [],
      });

      vi.mocked(jwtDecode).mockReturnValue({
        role: "user",
        sub: "123",
        email: "test@test.com",
        exp: Date.now() + 3600000,
        iat: Date.now(),
      });

      const { login } = useAuthStore.getState();

      await act(async () => {
        await login({ email: "test@test.com", password: "password" });
      });

      expect(localStorage.getItem("accessToken")).toBe("test-access-token");
    });

    it("returns error message on failed login", async () => {
      const { login: apiLogin } = await import("../api/mutations/login");

      vi.mocked(apiLogin).mockResolvedValue({
        success: false,
        payload: {
          accessToken: "",
          refreshToken: "",
          message: "Invalid credentials",
          errors: ["Wrong password"],
        },
        errors: ["Wrong password"],
      });

      const { login } = useAuthStore.getState();

      let result;
      await act(async () => {
        result = await login({ email: "test@test.com", password: "wrong" });
      });

      expect(result).toEqual({
        success: false,
        message: "Invalid credentials",
        errors: ["Wrong password"],
      });
    });
  });

  describe("logout", () => {
    it("clears authentication state", async () => {
      // First set up authenticated state
      act(() => {
        useAuthStore.setState({
          isAuthenticated: true,
          initialized: true,
          userRole: "user",
        });
      });

      const { logout } = useAuthStore.getState();

      act(() => {
        logout();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.userRole).toBe(null);
    });

    it("removes access token from localStorage", async () => {
      localStorage.setItem("accessToken", "test-token");

      const { logout } = useAuthStore.getState();

      act(() => {
        logout();
      });

      expect(localStorage.getItem("accessToken")).toBe(null);
    });
  });

  describe("refresh", () => {
    it("updates authentication when token is refreshed", async () => {
      const { refresh: apiRefresh } = await import("../api/mutations/refresh");
      const { getAccessToken } = await import("@/utils/getAccessToken");
      const { jwtDecode } = await import("jwt-decode");

      vi.mocked(getAccessToken).mockReturnValue("existing-token");
      vi.mocked(apiRefresh).mockResolvedValue("new-access-token");
      vi.mocked(jwtDecode).mockReturnValue({
        role: "admin",
        sub: "123",
        email: "test@test.com",
        exp: Date.now() + 3600000,
        iat: Date.now(),
      });

      const { refresh } = useAuthStore.getState();

      await act(async () => {
        await refresh();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(true);
      expect(state.userRole).toBe("admin");
    });

    it("clears auth state when no token exists", async () => {
      const { getAccessToken } = await import("@/utils/getAccessToken");

      vi.mocked(getAccessToken).mockReturnValue(null);

      const { refresh } = useAuthStore.getState();

      await act(async () => {
        await refresh();
      });

      const state = useAuthStore.getState();
      expect(state.isAuthenticated).toBe(false);
      expect(state.initialized).toBe(true);
    });
  });
});
