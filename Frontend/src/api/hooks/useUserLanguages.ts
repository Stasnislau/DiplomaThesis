import { useQuery } from "@tanstack/react-query";
import { getMyLanguages } from "../queries/getMyLanguages";

export interface UserLanguage {
  languageId: string;
  userId: string;
  isStarted: boolean;
  totalLessons: number;
  completedLessons: number;
  currentLevel: string;
  isNative: boolean;
  level: string;
}

export function useMyLanguages() {
  const {
    data: languages,
    isLoading,
    error,
  } = useQuery<UserLanguage[], Error>({
    queryKey: ["languages"],
    queryFn: () => getMyLanguages(),
    staleTime: Infinity,
  });

  return {
    languages,
    isLoading,
    error,
  };
}
