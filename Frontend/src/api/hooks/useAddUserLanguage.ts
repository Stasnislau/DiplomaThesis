import {
  AddUserLanguageRequest,
  addUserLanguage,
} from "../mutations/addUserLanguage";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useAddUserLanguage() {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: AddUserLanguageRequest) => addUserLanguage(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "getMe"] });
    },
  });

  return {
    addUserLanguage: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
