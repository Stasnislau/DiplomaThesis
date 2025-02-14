import { useMutation } from "@tanstack/react-query";
import {
  evaluatePlacementTest,
  EvaluatePlacementTestRequest,
  EvaluationResult,
} from "../mutations/evaluatePlacementTest";

export function useEvaluatePlacementTest() {
  const mutation = useMutation<EvaluationResult, Error, EvaluatePlacementTestRequest>({
    mutationFn: async (input: EvaluatePlacementTestRequest) => {
      return evaluatePlacementTest(input);
    },
  });

  return {
    evaluateTest: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
  };
} 