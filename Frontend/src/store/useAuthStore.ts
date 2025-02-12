import { create } from "zustand";
import { login as apiLogin, LoginUserRequest } from "../api/mutations/login";
import { refresh as apiRefresh } from "../api/mutations/refresh";
import Cookies from "js-cookie";
import { logout as apiLogout } from "../api/mutations/logout";
import { getAccessToken } from "@/utils/getAccessToken";

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  login: (
    input: LoginUserRequest
  ) => Promise<{ success: boolean; message?: string; errors?: string[] }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  initialized: false,
  userRole: null,
  login: async (input: LoginUserRequest) => {
    try {
      const data = await apiLogin(input);
      if (data.success) {
        localStorage.setItem("accessToken", data.payload.accessToken);
        if (
          data.payload.refreshToken !== undefined &&
          data.payload.refreshToken !== ""
        ) {
          Cookies.set("refreshToken", data.payload.refreshToken);
        }
        set({
          isAuthenticated: true,
          initialized: true,
        });
        return { success: true };
      } else {
        set({ initialized: true });
        return {
          success: false,
          message: data.payload.message,
          errors: data.payload.errors,
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      set({ initialized: true });
      return { success: false, message: "Unknown error" };
    }
  },
  logout: () => {
    apiLogout();
    localStorage.removeItem("accessToken");
    Cookies.remove("refreshToken");
    set({
      isAuthenticated: false,
      isLoading: false,
      initialized: true,
    });
  },
  refresh: async () => {
    if (getAccessToken() === null) {
      set({ isLoading: false, initialized: true });
      return;
    }
    set({ isLoading: true });
    try {
      const newAccessToken = await apiRefresh();
      localStorage.setItem("accessToken", newAccessToken);
      set({
        isAuthenticated: true,
        initialized: true,
      });
    } catch (error) {
      console.error("Refresh failed:", error);
      set({
        isAuthenticated: false,
        initialized: true,
      });
    } finally {
      set({ isLoading: false });
    }
  },
}));
