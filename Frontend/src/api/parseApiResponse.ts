import { BaseResponse } from "@/types/responses/BaseResponse";

import { asApiError } from "./extractApiError";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function readJsonOrText(response: Response): Promise<unknown> {
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

export async function parseApiResponse<T = unknown>(
  response: Response,
  fallback: string,
): Promise<BaseResponse<T>> {
  const data = await readJsonOrText(response);
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

export async function parseApiPayload<T = unknown>(
  response: Response,
  fallback: string,
): Promise<T> {
  const wrapped = await parseApiResponse<T>(response, fallback);
  return wrapped.payload;
}
