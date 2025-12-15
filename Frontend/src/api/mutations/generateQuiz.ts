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

export const generateQuiz = async (selectedTypes?: string[]): Promise<GenerateQuizResponse> => {
  const response = await fetchWithAuth(`${BRIDGE_MICROSERVICE_URL}/materials/quiz`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      selected_types: selectedTypes
    }), 
  });

  const data = (await response.json()) as BaseResponse<GenerateQuizResponse>;
  if (!data.success) {
    throw new Error(data?.errors?.[0] || "Failed to generate tasks");
  }

  return data.payload;
};
