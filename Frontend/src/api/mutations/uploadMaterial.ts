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

  const data = (await response.json()) as BaseResponse<UploadMaterialResponse>;
  if (!data.success) {
    throw new Error(extractApiError(data, "Failed to upload material"));
  }

  return data.payload;
};
