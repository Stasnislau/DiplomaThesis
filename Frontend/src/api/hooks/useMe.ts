import { UseQueryOptions, useQuery } from "@tanstack/react-query";

import { User } from "@/types/models/User";
import { getMe } from "@/api/queries/getMe";

type MeQueryKey = ["users", "getMe"];

type UseMeOptions = Omit<
  UseQueryOptions<User, Error, User, MeQueryKey>,
  "queryKey" | "queryFn"
>;

export function useMe(options?: UseMeOptions) {
  const {
    data: me,
    isFetching,
    isLoading,
    isSuccess,
    error,
  } = useQuery<User, Error, User, MeQueryKey>({
    queryKey: ["users", "getMe"],
    queryFn: getMe,
    ...options,
  });

  return {
    me,
    isFetching,
    isLoading,
    isSuccess,
    error,
  };
}
