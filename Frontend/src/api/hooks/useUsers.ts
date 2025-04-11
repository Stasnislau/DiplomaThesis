import { getAllUsers } from "../queries/getAllUsers";
import { useQuery } from "@tanstack/react-query";

export function useUsers() {
    const { data, isLoading, error } = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
  });

  return {
    users: data,
    isLoading,
    error,
  };
}
