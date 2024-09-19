import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    explainAnswer,
  ExplainAnswerRequest,
  ExplainAnswerResponse,
} from "../mutations/explainAnswer";

export function useExplainAnswer() {
  const queryClient = useQueryClient();

  const mutation = useMutation<
    ExplainAnswerResponse,
    Error,
    ExplainAnswerRequest
  >({
    mutationFn: async (input: ExplainAnswerRequest) => {
      return explainAnswer(input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["explainAnswer"] });
    },
  });

  return {
    explainAnswer: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}
