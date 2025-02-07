import { useQuery } from "@tanstack/react-query";
import { getAvailableLanguages } from "../queries/getAvailableLanguages";

export interface Language {
  id: string;
  name: string;
  code: string;
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
