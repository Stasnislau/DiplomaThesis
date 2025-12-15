import { useMutation } from "@tanstack/react-query";
import {
  generateTaskFromTemplate,
  GenerateTaskFromTemplateRequest,
  GeneratedTaskResponse,
} from "../mutations/generateTaskFromTemplate";

export const useGenerateTaskFromTemplate = () => {
  return useMutation<GeneratedTaskResponse, Error, GenerateTaskFromTemplateRequest>({
    mutationFn: generateTaskFromTemplate,
  });
};

