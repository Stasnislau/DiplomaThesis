import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createMultipleChoiceTask } from '../mutations/createMultipleChoiceTask';
import { createTaskRequest } from '../mutations/createBlankSpaceTask';

export function useCreateMultipleChoiceTask() {
  const queryClient = useQueryClient();

  const mutation = useMutation<any, Error, createTaskRequest>({
    mutationFn: async (input: createTaskRequest) => {
      return createMultipleChoiceTask(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === 'getTask',
      });
    },
  });

  return {
    createTask: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}