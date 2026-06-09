/**
 * One place to turn a AI / Auth / User error response into something
 * the UI can reason about.
 *
 * Modern wire format (since the structured-error refactor):
 *   - Nest microservices: `{ success: false, payload: { code, message, ... } }`
 *   - AI (FastAPI):    `{ detail: { code, message } }`
 *   - Both expose `code` as a sibling field, no parsing required.
 *
 * Legacy fallback we still honour:
 *   - `{ detail: "CODE: english fallback" }`
 *   - `{ payload: { message: "CODE: english fallback" } }`
 * Older deployments and the rare uncaught throw might still emit the
 * embedded prefix; we keep parsing it so a stray response doesn't drop
 * the localized error path.
 *
 * Returns `{ code, message }` so callers can `t("errors.codes." + code)`.
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
 * Try to read `code` (and message) directly from a structured error
 * payload — this is the preferred path under the new wire contract.
 * Looks at, in priority order:
 *   - `payload.code` + `payload.message`     (Nest-wrapped responses)
 *   - `detail.code`  + `detail.message`      (FastAPI structured detail)
 *   - top-level `code` + `message`            (rare passthroughs)
 *
 * Returns null when no structured code is present, telling the caller
 * to fall back to legacy CODE-prefixed string parsing.
 */
function readStructuredError(
  apiResult: unknown,
): ParsedApiError | null {
  if (!apiResult || typeof apiResult !== "object") return null;
  const result = apiResult as Record<string, unknown>;

  const candidates: Array<Record<string, unknown> | undefined> = [
    result.payload as Record<string, unknown> | undefined,
    typeof result.detail === "object" && result.detail !== null
      ? (result.detail as Record<string, unknown>)
      : undefined,
    result,
  ];

  for (const obj of candidates) {
    if (!obj) continue;
    const code = typeof obj.code === "string" ? obj.code : undefined;
    if (!code) continue;
    const message =
      typeof obj.message === "string" && obj.message.trim()
        ? (obj.message as string)
        : "";
    return { code, message };
  }
  return null;
}

/**
 * Parse an API error into { code, message }. Use this when you want to
 * branch on the structured backend code (e.g. for an i18n lookup).
 */
export function parseApiError(
  apiResult: unknown,
  fallback = "Request failed",
): ParsedApiError {
  // Modern wire format wins — `code` and `message` arrive as separate
  // fields, no string parsing required.
  const structured = readStructuredError(apiResult);
  if (structured) {
    return {
      code: structured.code,
      message: structured.message || fallback,
    };
  }

  // Legacy fallback: scan whatever string field the response carries
  // for a "CODE: msg" prefix, and split it.
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
