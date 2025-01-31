import { User } from "@/types/models/User";
import { getMe } from "@/api/queries/getMe";
import { useQuery } from "@tanstack/react-query";

export function useMe() {
  const {
    data: me,
    isFetching,
    error,
  } = useQuery<User, Error>({
    queryFn: async () => {
      return getMe();
    },
    queryKey: ["users", "getMe"],
  });

  return {
    me,
    isFetching,
    error,
  };
}
