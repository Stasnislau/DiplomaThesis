import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  type?: string;
  context_text?: string;
}

/**
 * Backend returns either a quiz object with questions, or — when no
 * relevant material was found — a plain string explaining why.
 * Callers must handle both shapes.
 */
type QuizPayload = { questions: QuizQuestion[] } | string;

interface GenerateQuizResponse {
  quiz: QuizPayload;
}

export interface GenerateQuizParams {
  selectedTypes?: string[];
  /**
   * The language the user is currently studying. When set, the backend
   * is told to write question/options/correct_answer in this language
   * regardless of the source PDF's language.
   */
  targetLanguage?: string;
}

export const generateQuiz = async (
  params: GenerateQuizParams = {},
): Promise<GenerateQuizResponse> => {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/materials/quiz`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        selected_types: params.selectedTypes,
        target_language: params.targetLanguage,
      }),
    },
  );

  return parseApiPayload<GenerateQuizResponse>(
    response,
    "Failed to generate tasks",
  );
};
