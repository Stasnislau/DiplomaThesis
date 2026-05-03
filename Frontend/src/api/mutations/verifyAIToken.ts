import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { fetchWithAuth } from "../fetchWithAuth";
import { parseApiPayload } from "../parseApiResponse";

export interface VerifyAITokenResponse {
  valid: boolean;
  provider: string;
  message: string;
}

/**
 * Two valid shapes:
 *  - { tokenId } — verify an already-saved token by id (Bridge will pull the
 *    raw value from User service via INTERNAL_SERVICE_KEY).
 *  - { aiProviderId, token } — verify a fresh key before saving it.
 */
export type VerifyAITokenRequest =
  | { tokenId: string }
  | { aiProviderId: string; token: string };

export const verifyAIToken = async (
  input: VerifyAITokenRequest,
): Promise<VerifyAITokenResponse> => {
  const response = await fetchWithAuth(
    `${BRIDGE_MICROSERVICE_URL}/ai-tokens/verify`,
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
