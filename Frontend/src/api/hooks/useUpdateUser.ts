import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUser, UpdateUserRequest } from "../mutations/updateUser";

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const mutation = useMutation<boolean, Error, UpdateUserRequest>({
    mutationFn: async (data: UpdateUserRequest) => {
      return updateUser(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user", "getMe"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return {
    updateUser: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
