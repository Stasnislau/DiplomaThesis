import { AI_MICROSERVICE_URL } from "../consts";
import { QuizQuestion } from "./generateQuiz";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

/**
 * Quiz-route variant types. Mirrors the backend's TypedTaskRequest
 * Literal union; essay is NOT in this list because essay flows
 * through a dedicated /writing/essay/generate + EssayTask renderer
 * (it has a separate evaluation pipeline).
 */
export type TypedTaskType =
  | "multiple_choice"
  | "fill_in_the_blank"
  | "true_false"
  | "multi_select_mc"
  | "matching"
  | "cloze_passage"
  | "open";

interface TypedTaskRequest {
  language: string;
  level: string;
  taskType: TypedTaskType;
}

export const generateTypedTask = async (
  body: TypedTaskRequest,
): Promise<QuizQuestion> => {
  const res = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/writing/typed-task`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  return parseApiPayload<QuizQuestion>(
    res,
    "Failed to generate typed task",
  );
};
