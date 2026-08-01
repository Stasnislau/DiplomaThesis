import { AI_MICROSERVICE_URL } from "../consts";
import { ApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface AnalyzedType {
  type: string;
  example: string;
}

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

export { ApiError as UploadMaterialError };

export const uploadMaterial = async (
  file: File,
): Promise<UploadMaterialResponse> => {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/materials/upload`,
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
