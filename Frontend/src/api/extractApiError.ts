export function extractApiError(
  apiResult: unknown,
  fallback = "Request failed"
): string {
  if (!apiResult || typeof apiResult !== "object") return fallback;

  const result = apiResult as Record<string, unknown>;
  const payload = result.payload as Record<string, unknown> | undefined;

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    return payload.errors.join("\n");
  }

  if (typeof payload?.message === "string" && payload.message.trim()) {
    return payload.message;
  }

  if (Array.isArray(result.errors) && result.errors.length > 0) {
    return (result.errors as string[]).join("\n");
  }

  if (typeof result.message === "string" && result.message.trim()) {
    return result.message as string;
  }

  return fallback;
}
