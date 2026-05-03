import { useMutation } from "@tanstack/react-query";
import {
  VerifyAITokenRequest,
  verifyAIToken,
} from "../mutations/verifyAIToken";

export const useVerifyAIToken = () => {
  const mutation = useMutation({
    mutationFn: (input: VerifyAITokenRequest) => verifyAIToken(input),
  });

  return {
    verifyToken: mutation.mutate,
    verifyTokenAsync: mutation.mutateAsync,
    isVerifying: mutation.isPending,
    error: mutation.error,
    data: mutation.data,
    reset: mutation.reset,
  };
};
