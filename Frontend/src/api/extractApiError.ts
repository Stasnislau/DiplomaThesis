
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
    (typeof result.detail === "string" && result.detail.trim()
      ? (result.detail as string)
      : "") ||
    normalizeErrors(payload?.errors) ||
    (typeof payload?.message === "string" && payload.message.trim()
      ? (payload.message as string)
      : "") ||
    normalizeErrors(result.errors) ||
    (typeof result.message === "string" && result.message.trim()
      ? (result.message as string)
      : "") ||
    fallback
  );
}

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

export function parseApiError(
  apiResult: unknown,
  fallback = "Request failed",
): ParsedApiError {
  const structured = readStructuredError(apiResult);
  if (structured) {
    return {
      code: structured.code,
      message: structured.message || fallback,
    };
  }

  const raw = rawErrorString(apiResult, fallback);
  const match = CODE_PREFIX_RE.exec(raw);
  if (match) {
    return { code: match[1], message: match[2] };
  }
  return { code: undefined, message: raw };
}

export function extractApiError(
  apiResult: unknown,
  fallback = "Request failed",
): string {
  return parseApiError(apiResult, fallback).message;
}

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
