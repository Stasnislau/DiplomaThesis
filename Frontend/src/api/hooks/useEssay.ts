import {
  EssayTask,
  GenerateEssayRequest,
  generateEssayTask,
} from "../mutations/generateEssayTask";
import {
  EssayEvaluation,
  EvaluateEssayRequest,
  evaluateEssay,
} from "../mutations/evaluateEssay";
import { useMutation } from "@tanstack/react-query";

export function useGenerateEssay() {
  const mutation = useMutation<EssayTask, Error, GenerateEssayRequest>({
    mutationFn: generateEssayTask,
  });
  return {
    generate: mutation.mutate,
    generateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}

export function useEvaluateEssay() {
  const mutation = useMutation<EssayEvaluation, Error, EvaluateEssayRequest>({
    mutationFn: evaluateEssay,
  });
  return {
    evaluate: mutation.mutate,
    evaluateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
}
