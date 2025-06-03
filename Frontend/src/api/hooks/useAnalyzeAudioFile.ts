import { useMutation } from "@tanstack/react-query";
import { analyzeSpeech } from "../mutations/analyzeAudioFile";

export const useAnalyzeAudioFile = () => {
  const mutation = useMutation({
    mutationFn: analyzeSpeech,
  });

  return {
    analyzeAudioFile: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
};
