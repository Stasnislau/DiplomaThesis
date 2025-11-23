import { useMutation } from "@tanstack/react-query";
import {
  updatePassword,
  UpdatePasswordRequest,
} from "../mutations/updatePassword";

export function useUpdatePassword() {
  const mutation = useMutation<boolean, Error, UpdatePasswordRequest>({
    mutationFn: async (data: UpdatePasswordRequest) => {
      return updatePassword(data);
    },
  });

  return {
    updatePassword: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}
