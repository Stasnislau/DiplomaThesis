import { create } from "zustand";
import { login as apiLogin, LoginUserRequest } from "../api/mutations/login";
import { refresh as apiRefresh } from "../api/mutations/refresh";
import Cookies from "js-cookie";
import { logout as apiLogout } from "../api/mutations/logout";
import { getAccessToken } from "@/utils/getAccessToken";
import { jwtDecode } from "jwt-decode";

interface DecodedToken {
  role: string;
  sub: string;
  email: string;
  exp: number;
  iat: number;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  initialized: boolean;
  userRole: string | null;
  login: (
    input: LoginUserRequest
  ) => Promise<{ success: boolean; message?: string; errors?: string[] }>;
  logout: () => void;
  refresh: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, _get) => ({
  isAuthenticated: false,
  isLoading: true,
  initialized: false,
  userRole: null,

  login: async (input: LoginUserRequest) => {
    try {
      const data = await apiLogin(input);
      if (data.success) {
        const accessToken = data.payload.accessToken;
        localStorage.setItem("accessToken", accessToken);
        
        if (
          data.payload.refreshToken !== undefined &&
          data.payload.refreshToken !== ""
        ) {
          Cookies.set("refreshToken", data.payload.refreshToken);
        }

        // Decode token to get role
        let userRole = null;
        try {
          const decoded = jwtDecode<DecodedToken>(accessToken);
          userRole = decoded.role;
        } catch (e) {
          console.error("Failed to decode token during login", e);
        }

        set({
          isAuthenticated: true,
          initialized: true,
          userRole: userRole,
        });
        return { success: true };
      } else {
        set({ initialized: true, isLoading: false });
        return {
          success: false,
          message: data.payload.message,
          errors: data.payload.errors,
        };
      }
    } catch (error: any) {
      console.error("Login error:", error);
      set({ initialized: true });
      return { success: false, message: error.message };
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
      userRole: null,
    });
  },
  refresh: async () => {
    const token = getAccessToken();
    if (token === null) {
      set({ isLoading: false, initialized: true, userRole: null });
      return;
    }
    set({ isLoading: true });
    try {
      const newAccessToken = await apiRefresh();
      if (!newAccessToken) {
        set({
          isAuthenticated: false,
          initialized: true,
          isLoading: false,
          userRole: null,
        });
        return;
      }
      localStorage.setItem("accessToken", newAccessToken);
      
      // Decode new token
      let userRole = null;
      try {
        const decoded = jwtDecode<DecodedToken>(newAccessToken);
        userRole = decoded.role;
      } catch (e) {
        console.error("Failed to decode token during refresh", e);
      }

      set({
        isAuthenticated: true,
        initialized: true,
        isLoading: false,
        userRole: userRole,
      });
    } catch (error) {
      console.error("Refresh failed:", error);
      localStorage.removeItem("accessToken");
      Cookies.remove("refreshToken");
      set({
        isAuthenticated: false,
        initialized: true,
        isLoading: false,
        userRole: null,
      });
    }
  },
}));
