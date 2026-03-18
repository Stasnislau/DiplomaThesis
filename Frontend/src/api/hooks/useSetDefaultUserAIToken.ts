import { useMutation, useQueryClient } from "@tanstack/react-query";

import { setDefaultUserAIToken } from "../mutations/setDefaultUserAIToken";

export const useSetDefaultUserAIToken = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (id: string) => setDefaultUserAIToken(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ai-tokens"] });
    },
  });

  return {
    setDefaultToken: mutation.mutate,
    isSettingDefault: mutation.isPending,
    error: mutation.error,
  };
};
