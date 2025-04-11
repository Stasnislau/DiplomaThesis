import { getAccessToken } from "@/utils/getAccessToken";
import { useAuthStore } from "@/store/useAuthStore";

type FetchOptions = {
  method: string;
  headers?: Record<string, string>;
  body?: string;
};

export async function fetchWithAuth(url: URL | string, options: FetchOptions) {
  try {
    let token = getAccessToken();
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
        await useAuthStore.getState().refresh();
        token = getAccessToken();
        response = await fetch(url, {
          ...options,
          headers: {
            ...headers,
            Authorization: `Bearer ${token}`,
          },
        });
    }
    return response;
  } catch (error) {
    throw error;
  }
}
