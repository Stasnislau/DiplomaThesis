import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateUserRole } from "../mutations/updateUserRole";

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error } = useMutation({
    mutationFn: (data: { id: string; role: "USER" | "ADMIN" }) =>
      updateUserRole(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return {
    updateRole: mutateAsync,
    isLoading: isPending,
    error,
  };
}
