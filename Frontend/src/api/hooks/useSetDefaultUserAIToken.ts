import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setDefaultUserAIToken } from "../mutations/setDefaultUserAIToken";

export const useSetDefaultUserAIToken = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => setDefaultUserAIToken(id),
    onSuccess: () => {
      // Invalidate tokens query to refresh list (and isDefault status)
      queryClient.invalidateQueries({ queryKey: ["ai-tokens"] });
    },
  });

  return {
    setDefaultToken: mutation.mutate,
    isSettingDefault: mutation.isPending,
    error: mutation.error,
  };
};
