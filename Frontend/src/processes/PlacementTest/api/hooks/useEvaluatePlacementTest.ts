import { useMutation } from "@tanstack/react-query";
import {
  evaluatePlacementTest,
  EvaluatePlacementTestRequest,
} from "../mutations/evaluatePlacementTest";
import { EvaluationResult } from "../../types/EvaluationResult";

export function useEvaluatePlacementTest() {
  const mutation = useMutation<
    EvaluationResult,
    Error,
    EvaluatePlacementTestRequest
  >({
    mutationFn: async (input: EvaluatePlacementTestRequest) => {
      return evaluatePlacementTest(input);
    },
  });

  return {
    evaluateTest: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
}
