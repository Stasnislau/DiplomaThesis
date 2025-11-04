import { AiToken } from '@/types/models/AiToken';
import { fetchWithAuth } from '../fetchWithAuth';
import { USER_MICROSERVICE_URL } from '../consts';

export interface CreateUserAITokenRequest {
  token: string;
  model: string;
}

export const createUserAIToken = async (
  input: CreateUserAITokenRequest,
): Promise<AiToken> => {
  const response = await fetchWithAuth(`${USER_MICROSERVICE_URL}/ai-tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error('Failed to create AI token');
  }

  return response.json();
};
