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
    // Initialize with Authorization, Content-Type might be added later
    const currentHeaders: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };

    // Conditionally set Content-Type unless it's FormData
    if (!(options.body instanceof FormData)) {
      // If Content-Type is explicitly provided in options.headers, use it
      if (options.headers && options.headers["Content-Type"]) {
        currentHeaders["Content-Type"] = options.headers["Content-Type"];
      } else if (options.body) {
        // Otherwise, if there's a body (and it's not FormData), default to application/json
        currentHeaders["Content-Type"] = "application/json";
      }
    }
    // Note: If options.body is FormData, Content-Type is deliberately NOT set here.
    // The browser will set it, including the boundary.
    // If options.headers *explicitly* contains Content-Type for FormData (which is wrong),
    // it will be spread below. Ideally, this should be avoided by the caller.

    const finalHeaders = {
      ...currentHeaders, // Headers built so far (Auth, possibly Content-Type for non-FormData)
      ...options.headers, // User-provided headers (can override, e.g., Accept, or wrongly Content-Type for FormData)
    };
    
    // If it's FormData and Content-Type somehow got into finalHeaders from options.headers
    // (and wasn't the one we conditionally set for non-FormData), we should remove it
    // to let the browser do its job. This is a safeguard.
    if (options.body instanceof FormData && finalHeaders["Content-Type"] && 
        !(currentHeaders["Content-Type"] && currentHeaders["Content-Type"] === finalHeaders["Content-Type"])) {
      // Only delete if it was NOT the one set by our non-FormData logic and came from options.headers
      // This case implies caller wrongly set Content-Type for FormData in options.headers.
      // Actually, simpler: if it is FormData, Content-Type should NOT be in finalHeaders unless specifically
      // managed by browser. So, if it IS FormData, ensure any manually set Content-Type is GONE.
      delete finalHeaders["Content-Type"];
    }

    let response = await fetch(url, {
      ...options,
      headers: finalHeaders,
    });

    if (response.status === 401) {
        await useAuthStore.getState().refresh();
        token = getAccessToken();
        
        // Rebuild headers with the new token, applying the same Content-Type logic
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
