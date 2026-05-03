import { BRIDGE_MICROSERVICE_URL } from "../consts";
import { asApiError } from "../extractApiError";
import { fetchWithAuth } from "../fetchWithAuth";

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

  const data = await response.json();
  // Bridge returns FastAPI `{detail: "CODE: msg"}` on 4xx and the gateway
  // sometimes wraps it as `{success: false, payload: {...}}`. asApiError
  // handles both shapes and preserves the structured code so the UI can
  // localize via useLocalizedError.
  if (!response.ok || data?.success === false) {
    throw asApiError(data, "Failed to verify AI token");
  }
  return data.payload as VerifyAITokenResponse;
};
