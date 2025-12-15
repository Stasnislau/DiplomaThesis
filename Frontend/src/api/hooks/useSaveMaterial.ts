import { useMutation, useQueryClient } from "@tanstack/react-query";
import { saveMaterial } from "../mutations/saveMaterial";

export const useSaveMaterial = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: saveMaterial,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-materials"] });
    },
  });
};

