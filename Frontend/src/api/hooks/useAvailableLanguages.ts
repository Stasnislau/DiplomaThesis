import { useQuery } from "@tanstack/react-query";
import { getAvailableLanguages } from "../queries/getAvailableLanguages";

export interface Language {
  name: string;
  code: string;
  isStarted: boolean;
  totalLessons: number;
  completedLessons?: number;
  levels: string[];
  currentLevel?: string;
}

export function useAvailableLanguages() {
  const {
    data: languages,
    isLoading,
    error,
  } = useQuery<Language[], Error>({
    queryKey: ["languages"],
    queryFn: getAvailableLanguages,
    staleTime: Infinity,
  });

  return {
    languages,
    isLoading,
    error,
  };
}
