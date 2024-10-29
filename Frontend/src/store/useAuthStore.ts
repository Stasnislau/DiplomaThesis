import { create } from "zustand";
import { login as apiLogin, LoginUserRequest } from "../api/mutations/login";
import { refresh as apiRefresh } from "../api/mutations/refresh";
import Cookies from "js-cookie";
import { logout as apiLogout } from "../api/mutations/logout";
interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginUserRequest) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  isLoading: false,
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
        set({ isAuthenticated: true, isLoading: false });
        return { success: true };
      } else {
        set({ isLoading: false });
        return { success: false, error: data.payload.message };
      }
    } catch (error) {
      console.error("Login error:", error);
      set({ isLoading: false });
      return { success: false, error: "Unknown error" };
    }
  },
  logout: () => {
    apiLogout();
    localStorage.removeItem("accessToken");
    Cookies.remove("refreshToken");
    set({ isAuthenticated: false, isLoading: false });
  },
  refresh: async () => {
    set({ isLoading: true });
    try {
      const newAccessToken = await apiRefresh();
      localStorage.setItem("accessToken", newAccessToken);
      set({ isAuthenticated: true, isLoading: false });
    } catch (error) {
      console.error("Refresh failed:", error);
      set({ isAuthenticated: false, isLoading: false });
    }
  },
}));
