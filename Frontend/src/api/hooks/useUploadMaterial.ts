import { useMutation } from "@tanstack/react-query";
import { uploadMaterial } from "../mutations/uploadMaterial";

export const useUploadMaterial = () => {
  return useMutation({
    mutationFn: uploadMaterial,
  });
};

