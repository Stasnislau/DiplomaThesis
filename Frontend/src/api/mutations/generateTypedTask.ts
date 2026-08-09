import { AI_MICROSERVICE_URL } from "../consts";
import { QuizQuestion } from "./generateQuiz";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export type TypedTaskType =
  | "multiple_choice"
  | "fill_in_the_blank"
  | "true_false"
  | "multi_select_mc"
  | "matching"
  | "cloze_passage"
  | "open"
  | "reading_comprehension";

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
