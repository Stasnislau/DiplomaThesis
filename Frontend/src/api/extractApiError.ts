function normalizeErrors(value: unknown): string {
  if (Array.isArray(value)) {
    const filtered = value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
    return filtered.join("\n");
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }
  return "";
}

export function extractApiError(
  apiResult: unknown,
  fallback = "Request failed"
): string {
  if (!apiResult || typeof apiResult !== "object") return fallback;

  const result = apiResult as Record<string, unknown>;
  const payload = result.payload as Record<string, unknown> | undefined;

  return (
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
