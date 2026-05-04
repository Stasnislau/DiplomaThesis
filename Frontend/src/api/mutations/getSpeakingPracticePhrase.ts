import { BRIDGE_MICROSERVICE_URL } from "../consts";
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

/**
 * Ask Bridge for a single sentence to read aloud, biased toward the
 * user's recent speaking weaknesses. Pair with /speaking/analyze:
 * the user records themselves saying this phrase, the analyzer
 * scores their pronunciation/grammar against it.
 */
export async function getSpeakingPracticePhrase(
  input: PracticePhraseRequest,
): Promise<PracticePhraseResponse> {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/speaking/practice-phrase`,
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
