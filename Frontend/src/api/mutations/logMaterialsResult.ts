import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface MaterialsErrorExample {
  type?: string;
  text?: string;
  suggestion?: string;
}

export interface LogMaterialsResultRequest {
  language?: string;
  level?: string;
  /** 0-100 — round((correctCount / questionCount) * 100). */
  score: number;
  questionCount: number;
  correctCount: number;
  questionTypes?: string[];
  errorExamples?: MaterialsErrorExample[];
  /** From DocumentMap.document_kind — lets the adaptive layer know
   *  which kind of material the user struggled with (e.g.
   *  TOEFL_Reading vs Murphy_Grammar). */
  documentKind?: string;
}

export const logMaterialsResult = async (
  body: LogMaterialsResultRequest,
): Promise<boolean> => {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/materials/result`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseApiPayload<boolean>(
    response,
    "Failed to log materials result",
  );
};
