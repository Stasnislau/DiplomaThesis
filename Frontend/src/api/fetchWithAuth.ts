import { getAccessToken } from "@/utils/getAccessToken";
import { useAuthStore } from "@/store/useAuthStore";

type FetchOptions = {
  method: string;
  headers?: Record<string, string>;
  body?: string;
};

export async function fetchWithAuth(url: URL | string, options: FetchOptions) {
  try {
    const token = getAccessToken();
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    };

    let response = await fetch(url, {
      ...options,
      headers,
    });
    if (response.status === 401) {
      try {
        await useAuthStore.getState().refresh();
        response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        });
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);
        throw refreshError;
      }
    }

    return response;
  } catch (error) {
    throw error;
  }
}
