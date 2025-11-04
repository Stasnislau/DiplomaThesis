import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  createUserAIToken,
  CreateUserAITokenRequest,
} from '../mutations/createUserAIToken';
import { AiToken } from '@/types/models/AiToken';

export const useCreateUserAIToken = () => {
  const queryClient = useQueryClient();

  return useMutation<AiToken, Error, CreateUserAITokenRequest>({
    mutationFn: createUserAIToken,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['ai-tokens'],
      });
    },
  });
};
