import { useMutation } from "@tanstack/react-query";
import { generateQuiz } from "../mutations/generateQuiz";

export const useGenerateQuiz = () => {
  return useMutation({
    mutationFn: generateQuiz,
  });
};
