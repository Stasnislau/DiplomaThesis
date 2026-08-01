import { AI_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface PracticePhraseRequest {
  language: string;
  level: string;
}

export interface PracticePhraseResponse {
  phrase: string;
  focus: string;
  translation: string;
  targetedWeaknesses: string[];
  derivedFromHistory: boolean;
}

export async function getSpeakingPracticePhrase(
  input: PracticePhraseRequest,
): Promise<PracticePhraseResponse> {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/speaking/practice-phrase`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );
  return parseApiPayload<PracticePhraseResponse>(
    response,
    "Failed to get practice phrase",
  );
}
