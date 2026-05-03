import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { ApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

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
 * Backwards-compatible re-export: old call sites still import
 * `UploadMaterialError` from this module, but the thrown value is
 * just an ApiError now (the structured `code` was always the point
 * of this class — and ApiError has it).
 */
export { ApiError as UploadMaterialError };

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

  return parseApiPayload<UploadMaterialResponse>(
    response,
    "Failed to upload material",
  );
};
