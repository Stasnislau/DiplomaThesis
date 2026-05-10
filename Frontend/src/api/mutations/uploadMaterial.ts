import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { ApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface AnalyzedType {
  type: string;
  example: string;
}

/**
 * Mirrors `DocumentExercise` in
 * Backend/BridgeMicroservice/models/dtos/material_dtos.py. Drives
 * Stage 2/3 of quiz generation; carries enough metadata for the
 * backend to know how long each stimulus passage should be and what
 * subtypes of questions to drill.
 */
export interface DocumentExercise {
  type: string;
  passage_word_count_estimate?: number | null;
  passage_topic_hint?: string | null;
  passage_excerpt_for_style?: string | null;
  question_count?: number | null;
  question_subtypes?: string[];
  grammar_focus?: string[];
  example?: string;
}

export interface DocumentMap {
  document_kind: string;
  exercises: DocumentExercise[];
}

interface UploadMaterialResponse {
  filename: string;
  chunks_count: number;
  status: string;
  templates_extracted?: number;
  analyzed_types?: AnalyzedType[];
  document_map?: DocumentMap | null;
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
