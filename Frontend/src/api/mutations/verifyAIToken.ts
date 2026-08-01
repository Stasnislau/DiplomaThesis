import { AI_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface VerifyAITokenResponse {
  valid: boolean;
  provider: string;
  message: string;
}

export type VerifyAITokenRequest =
  | { tokenId: string }
  | { aiProviderId: string; token: string };

export const verifyAIToken = async (
  input: VerifyAITokenRequest,
): Promise<VerifyAITokenResponse> => {
  const response = await fetchWithAuth(
    `${AI_MICROSERVICE_URL}/ai-tokens/verify`,
    {
      method: "POST",
      body: JSON.stringify(input),
    },
  );

  return parseApiPayload<VerifyAITokenResponse>(
    response,
    "Failed to verify AI token",
  );
};
