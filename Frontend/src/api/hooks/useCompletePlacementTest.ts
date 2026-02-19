import {
  CompletePlacementTestRequest,
  completePlacementTest,
} from "../mutations/completePlacementTest";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export const useCompletePlacementTest = () => {
  const queryClient = useQueryClient();

  const {
    mutateAsync: completeTest,
    isPending: isLoading,
    error,
  } = useMutation({
    mutationFn: (input: CompletePlacementTestRequest) =>
      completePlacementTest(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "getMe"] });
    },
  });

  return { completeTest, isLoading, error };
};
