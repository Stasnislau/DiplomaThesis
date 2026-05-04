/**
 * One funnel for every fetch response in the app.
 *
 * Why: each microservice fails in its own shape — FastAPI returns
 * `{ detail: "CODE: msg" }`, the Nest gateway wraps things as
 * `{ success: false, payload: { message } }` or `{ ..., errors: [] }`,
 * and a stray gateway 503 might not be JSON at all. Without a single
 * helper, every mutation reinvents the same `if (!data.success) throw …`
 * block — and as we saw with verifyAIToken, those rolled-by-hand checks
 * lose the structured `code` prefix that powers `useLocalizedError`.
 *
 * Both helpers throw `ApiError` (carries `.code` + message), so callers
 * can blindly hand the catch value to `useLocalizedError(err)` and get
 * a properly localized string out.
 */
import { BaseResponse } from "@/types/responses/BaseResponse";

import { asApiError } from "./extractApiError";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonOrText(response: Response): Promise<unknown> {
  // Try JSON first — that's the 99% case. Fall back to raw text only
  // when the body isn't valid JSON (e.g. an HTML 502 from a reverse
  // proxy), and only when the Response actually exposes `.text()`
  // (test fakes often don't). Wrap the raw text in `{ detail }` so
  // asApiError can still surface it.
  try {
    return await response.json();
  } catch {
    if (typeof response.text === "function") {
      try {
        const text = await response.text();
        return text ? { detail: text } : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * Read a Response, throw `ApiError` on any failure shape, and return the
 * parsed `BaseResponse<T>` envelope. Use when the caller needs the full
 * envelope (e.g. to read tokens off `data` directly, like login).
 */
export async function parseApiResponse<T = unknown>(
  response: Response,
  fallback: string,
): Promise<BaseResponse<T>> {
  const data = await readJsonOrText(response);
  // We treat a response as failed when *either* the HTTP status says so
  // *or* the JSON envelope says so. We compare `ok` against `false`
  // explicitly so test mocks that omit the field (a very common shape)
  // aren't misclassified as failures.
  if (
    response.ok === false ||
    (isObject(data) && data.success === false)
  ) {
    throw asApiError(data, fallback);
  }
  if (!isObject(data)) {
    throw asApiError(null, fallback);
  }
  return data as unknown as BaseResponse<T>;
}

/**
 * Like `parseApiResponse` but unwraps `data.payload`, which is what
 * almost every mutation/query actually wants.
 */
export async function parseApiPayload<T = unknown>(
  response: Response,
  fallback: string,
): Promise<T> {
  const wrapped = await parseApiResponse<T>(response, fallback);
  return wrapped.payload;
}
