import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  AdaptiveTaskRequest,
  AdaptiveTaskResponse,
  generateAdaptiveTask,
} from "../mutations/generateAdaptiveTask";

export function useGenerateAdaptiveTask() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    AdaptiveTaskResponse,
    Error,
    AdaptiveTaskRequest
  >({
    mutationFn: (input) => generateAdaptiveTask(input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (q) => q.queryKey[0] === "getHistory",
      });
    },
  });

  return {
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
    reset: mutation.reset,
  };
}
