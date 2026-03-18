import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteUser } from "../mutations/deleteUser";

export function useDeleteUser() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (id: string) => deleteUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return {
    deleteUser: mutateAsync,
    isLoading: isPending,
    error,
  };
}
