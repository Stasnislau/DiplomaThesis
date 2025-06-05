import { getAccessToken } from "@/utils/getAccessToken";
import { useAuthStore } from "@/store/useAuthStore";

type FetchOptions = {
  method: string;
  headers?: Record<string, string>;
  body?: string | FormData;
};

export async function fetchWithAuth(url: URL | string, options: FetchOptions) {
  try {
    let token = getAccessToken();
    const currentHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    if (!(options.body instanceof FormData)) {
      if (options.headers && options.headers["Content-Type"]) {
        currentHeaders["Content-Type"] = options.headers["Content-Type"];
      } else if (options.body) {
        currentHeaders["Content-Type"] = "application/json";
      }
    }

    const finalHeaders = {
      ...currentHeaders, 
      ...options.headers, 
    };
    
    if (options.body instanceof FormData && finalHeaders["Content-Type"] && 
        !(currentHeaders["Content-Type"] && currentHeaders["Content-Type"] === finalHeaders["Content-Type"])) {
      delete finalHeaders["Content-Type"];
    }

    let response = await fetch(url, {
      ...options,
      headers: finalHeaders,
    });

    if (response.status === 401) {
        await useAuthStore.getState().refresh();
        token = getAccessToken();
        
        const refreshedHeaders: Record<string, string> = {
            Authorization: `Bearer ${token}`,
        };
        if (!(options.body instanceof FormData)) {
            if (options.headers && options.headers["Content-Type"]) {
                refreshedHeaders["Content-Type"] = options.headers["Content-Type"];
            } else if (options.body) {
                refreshedHeaders["Content-Type"] = "application/json";
            }
        }
        const finalRefreshedHeaders = {
            ...refreshedHeaders,
            ...options.headers,
        };
        if (options.body instanceof FormData) {
            delete finalRefreshedHeaders["Content-Type"]; // Ensure browser sets it for FormData
        }

        response = await fetch(url, {
          ...options,
          headers: finalRefreshedHeaders,
        });
    }
    return response;
  } catch (error) {
    console.error("Fetch error in fetchWithAuth:", error);
    throw error;
  }
}
