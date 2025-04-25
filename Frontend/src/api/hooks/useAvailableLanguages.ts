import { useQuery } from "@tanstack/react-query";
import { getAvailableLanguages } from "../queries/getAvailableLanguages";
import { LanguageLevel } from "@/types/models/LanguageLevel";

export interface Language {
  id: string;
  name: string;
  code: string;
  currentLevel: LanguageLevel;
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
