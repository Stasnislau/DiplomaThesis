import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createTask, createTaskRequest } from '../createTask';

export function useCreateTask() {
  const queryClient = useQueryClient();

  const mutation = useMutation<any, Error, createTaskRequest>({
    mutationFn: async (input: createTaskRequest) => {
      return createTask(input);
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