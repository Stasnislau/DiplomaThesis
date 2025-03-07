import { useMutation } from "@tanstack/react-query";
import { createPlacementTask, CreatePlacementTaskRequest } from "../mutations/createPlacementTask";

export function usePlacementTask() {
  const mutation = useMutation({
    mutationFn: async (input: CreatePlacementTaskRequest) => {
      return await createPlacementTask(input);
    },
  });

  return {
    createTask: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
} 