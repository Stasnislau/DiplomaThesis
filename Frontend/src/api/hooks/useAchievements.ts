import { getAchievements } from "../queries/getAchievements";
import { useQuery } from "@tanstack/react-query";

export const useAchievements = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ["achievements"],
    queryFn: getAchievements,
  });

  return {
    achievements: data ?? [],
    isLoading,
    error,
  };
};
