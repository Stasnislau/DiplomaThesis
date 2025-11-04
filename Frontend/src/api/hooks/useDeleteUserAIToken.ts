import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteUserAIToken } from '../mutations/deleteUserAIToken';

export const useDeleteUserAIToken = () => {
  const queryClient = useQueryClient();

  return useMutation<void, Error, string>({
    mutationFn: deleteUserAIToken,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ai-tokens"],
      });
    },
  });
};
