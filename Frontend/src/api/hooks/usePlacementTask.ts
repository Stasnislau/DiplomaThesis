import { useMutation } from "@tanstack/react-query";
import { createPlacementTask, CreatePlacementTaskRequest } from "../mutations/createPlacementTask";

export function usePlacementTask() {
  const mutation = useMutation({
    mutationFn: async (input: CreatePlacementTaskRequest) => {
      return createPlacementTask(input);
    },
  });

  return {
    createTask: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
} 