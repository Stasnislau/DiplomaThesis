import { getAccessToken } from "@/utils/getAccessToken";
import i18n from "@/config/i18n";
import { useAuthStore } from "@/store/useAuthStore";

type FetchOptions = {
  method: string;
  headers?: Record<string, string>;
  body?: string | FormData;
};

// Mutex: only one refresh at a time; concurrent 401s share the same promise.
let refreshPromise: Promise<void> | null = null;

function buildHeaders(
  token: string | null,
  options: FetchOptions,
): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    // Tell the backend which UI locale to use for AI-generated user-facing
    // text (explanations, feedback, hints). Picked up by Bridge's
    // extract_user_context and threaded into every prompt.
    "X-UI-Locale": (i18n.language || "en").split("-")[0].toLowerCase(),
  };

  if (!(options.body instanceof FormData)) {
    if (options.headers?.["Content-Type"]) {
      headers["Content-Type"] = options.headers["Content-Type"];
    } else if (options.body) {
      headers["Content-Type"] = "application/json";
    }
  }

  const merged = { ...headers, ...options.headers };

  if (options.body instanceof FormData) {
    delete merged["Content-Type"];
  }

  return merged;
}

export async function fetchWithAuth(url: URL | string, options: FetchOptions) {
  try {
    let token = getAccessToken();
    let response = await fetch(url, {
      ...options,
      headers: buildHeaders(token, options),
    });

    if (response.status === 401) {
      if (!refreshPromise) {
        refreshPromise = useAuthStore
          .getState()
          .refresh()
          .finally(() => {
            refreshPromise = null;
          });
      }
      await refreshPromise;

      token = getAccessToken();
      response = await fetch(url, {
        ...options,
        headers: buildHeaders(token, options),
      });
    }
    return response;
  } catch (error) {
    console.error("Fetch error in fetchWithAuth:", error);
    throw error;
  }
}
