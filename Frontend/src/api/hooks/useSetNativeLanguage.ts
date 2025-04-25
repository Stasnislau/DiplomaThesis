import { useMutation, useQueryClient } from "@tanstack/react-query";
import { setNativeLanguage,  } from "../mutations/setNativeLanguage";

export function useSetNativeLanguage() {
  const queryClient = useQueryClient();
  const mutation = useMutation<boolean, Error, string>({
    mutationFn: async (languageId: string) => {
      return setNativeLanguage(languageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users", "getMe"] });
    },
  });

  return {
    setNativeLanguage: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}
