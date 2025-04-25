import { User } from "@/types/models/User";
import { getMe } from "@/api/queries/getMe";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";

// Define a specific type for the query key
type MeQueryKey = ["users", "getMe"];

// Define options type, excluding queryKey and queryFn
type UseMeOptions = Omit<UseQueryOptions<User, Error, User, MeQueryKey>, 'queryKey' | 'queryFn'>;

// Allow passing React Query options, like `enabled`
export function useMe(options?: UseMeOptions) {
  const {
    data: me,
    isFetching,
    isLoading, // Also expose isLoading for initial load state
    isSuccess, // Expose isSuccess
    error,
  } = useQuery<User, Error, User, MeQueryKey>({
    queryKey: ["users", "getMe"], 
    queryFn: getMe, // Simplified queryFn
    ...options, // Spread the passed options here
  });

  return {
    me,
    isFetching,
    isLoading,
    isSuccess,
    error,
  };
}
