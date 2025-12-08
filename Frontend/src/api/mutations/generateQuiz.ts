import { BaseResponse } from "@/types/responses/BaseResponse";
import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_answer: string;
  type?: string;
}

interface GenerateQuizResponse {
  quiz: {
    questions: QuizQuestion[];
  };
}

export const generateQuiz = async (): Promise<GenerateQuizResponse> => {
  // Send empty body {} to ensure Content-Type is respected and some proxies don't complain about empty POST body
  const response = await fetchWithAuth(`${BRIDGE_MICROSERVICE_URL}/materials/quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}), 
  });

  const data = (await response.json()) as BaseResponse<GenerateQuizResponse>;
  if (!data.success) {
    throw new Error(data?.errors?.[0] || "Failed to generate tasks");
  }

  return data.payload;
};
