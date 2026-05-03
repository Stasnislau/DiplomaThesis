/**
 * One place to turn a Bridge / Auth / User error response into something
 * the UI can reason about.
 *
 * Bridge raises every HTTPException via `raise_with_code(CODE, status, msg)`,
 * which puts the wire-format detail as `"<CODE>: <english fallback>"`. The
 * gateway sometimes wraps that into `{success: false, payload: {...}}`,
 * sometimes passes through as `{detail: "..."}` (FastAPI default), and the
 * Nest microservices have their own `payload.message` / `payload.errors`
 * shapes. We try them all in priority order.
 *
 * Returns:
 *  - `{ code, message }` — `code` is the machine-readable prefix when
 *    present (so the UI can `t("errors.codes." + code)`), else undefined.
 *    `message` is the English fallback after the colon, or the whole
 *    string when there's no code, or the supplied default.
 */

export interface ParsedApiError {
  code: string | undefined;
  message: string;
}

const CODE_PREFIX_RE = /^([A-Z][A-Z0-9_]+):\s*(.*)$/;

function normalizeErrors(value: unknown): string {
  if (Array.isArray(value)) {
    const filtered = value.filter(
      (item): item is string =>
        typeof item === "string" && item.trim().length > 0,
    );
    return filtered.join("\n");
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "";
}

function rawErrorString(apiResult: unknown, fallback: string): string {
  if (!apiResult || typeof apiResult !== "object") return fallback;
  const result = apiResult as Record<string, unknown>;
  const payload = result.payload as Record<string, unknown> | undefined;

  return (
    // FastAPI default — `{ detail: "CODE: …" }`
    (typeof result.detail === "string" && result.detail.trim()
      ? (result.detail as string)
      : "") ||
    // Nest gateway-wrapped — `{ success: false, payload: { errors / message } }`
    normalizeErrors(payload?.errors) ||
    (typeof payload?.message === "string" && payload.message.trim()
      ? (payload.message as string)
      : "") ||
    // Plain { errors / message } at the top level
    normalizeErrors(result.errors) ||
    (typeof result.message === "string" && result.message.trim()
      ? (result.message as string)
      : "") ||
    fallback
  );
}

/**
 * Parse an API error into { code, message }. Use this when you want to
 * branch on the structured backend code (e.g. for an i18n lookup).
 */
export function parseApiError(
  apiResult: unknown,
  fallback = "Request failed",
): ParsedApiError {
  const raw = rawErrorString(apiResult, fallback);
  const match = CODE_PREFIX_RE.exec(raw);
  if (match) {
    return { code: match[1], message: match[2] };
  }
  return { code: undefined, message: raw };
}

/**
 * Backwards-compatible string extractor. Old call sites that just need
 * a single string keep working — the code prefix is stripped so the
 * fallback message is what the user sees.
 */
export function extractApiError(
  apiResult: unknown,
  fallback = "Request failed",
): string {
  return parseApiError(apiResult, fallback).message;
}

/**
 * Strongly-typed Error subclass thrown by mutations that want callers
 * to be able to reach for `.code` without unsafe casts.
 */
export class ApiError extends Error {
  constructor(public readonly code: string | undefined, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

export function asApiError(
  apiResult: unknown,
  fallback = "Request failed",
): ApiError {
  const { code, message } = parseApiError(apiResult, fallback);
  return new ApiError(code, message);
}
