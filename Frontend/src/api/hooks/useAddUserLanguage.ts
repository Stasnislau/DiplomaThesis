import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  addUserLanguage,
  AddUserLanguageRequest,
} from "../mutations/addUserLanguage";

export function useAddUserLanguage() {
    const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (data: AddUserLanguageRequest) => addUserLanguage(data),
    onSuccess: () => { 
        queryClient.invalidateQueries({ queryKey: ["user", "getMe"] });
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
