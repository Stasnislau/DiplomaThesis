import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { BaseResponse } from "@/types/responses/BaseResponse";
import { extractApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";

interface AnalyzedType {
  type: string;
  example: string;
}

interface UploadMaterialResponse {
  filename: string;
  chunks_count: number;
  status: string;
  templates_extracted?: number;
  analyzed_types?: AnalyzedType[];
}

/**
 * Error thrown by uploadMaterial. `code` is the structured prefix from
 * the backend (PDF_NO_TEXT / PDF_GARBLED_TEXT / PDF_AI_REJECTED), or
 * undefined for ad-hoc failures. The UI uses it to pick a friendly
 * localized explanation instead of dumping the raw English message.
 */
export class UploadMaterialError extends Error {
  constructor(public code: string | undefined, message: string) {
    super(message);
    this.name = "UploadMaterialError";
  }
}

export const uploadMaterial = async (
  file: File,
): Promise<UploadMaterialResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/materials/upload`,
    {
      method: "POST",
      body: formData,
    },
  );

  // Try to parse JSON; if the body isn't JSON (e.g. an HTML error page
  // from the gateway), fall through to a generic failure.
  let parsed: unknown = null;
  try {
    parsed = await response.json();
  } catch {
    // ignore — handled below
  }

  if (!response.ok || !(parsed as BaseResponse<unknown> | null)?.success) {
    // FastAPI shape:    { detail: "PDF_NO_TEXT: ..." }
    // Gateway shape:    { success: false, payload: { message: "..." } }
    // Either way, fish out the "<CODE>: rest" prefix when present.
    const raw =
      (parsed as { detail?: string } | null)?.detail ??
      extractApiError(parsed, "Failed to upload material");
    const match = /^([A-Z_]+):\s*(.*)$/.exec(raw);
    const code = match ? match[1] : undefined;
    const message = match ? match[2] : raw;
    throw new UploadMaterialError(code, message);
  }

  return (parsed as BaseResponse<UploadMaterialResponse>).payload;
};
