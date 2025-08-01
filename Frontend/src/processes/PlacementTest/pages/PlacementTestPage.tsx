import { useParams } from "react-router-dom";
import LoadingSpinner from "@/components/layout/Loading";
import { useAvailableLanguages } from "@/api/hooks/useAvailableLanguages";
import { PlacementTaskTopBar } from "../components/PlacementTaskTopBar";
import { PlacementTaskContainer } from "../components/PlacementTaskContainer";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { useEffect } from "react";
import TestResults from "../components/TestResults";

export function PlacementTestPage() {
  const { languageCode } = useParams<{ languageCode: string }>();

  const { languages, isLoading: isLoadingLanguages } = useAvailableLanguages();

  const currentLanguage = languages?.find((lang) => lang.code === languageCode);

  const { resetTest, language, setLanguage, isTestComplete } = usePlacementTestStore();

  console.log(currentLanguage);

  useEffect(() => {
    if (currentLanguage && !isLoadingLanguages) {
      resetTest();
      setLanguage(currentLanguage);
    }
  }, [currentLanguage, resetTest, setLanguage, isLoadingLanguages]);

  if (!language || isLoadingLanguages) {
    return <LoadingSpinner />;
  }

  if (isTestComplete) {
    return <TestResults />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <PlacementTaskTopBar />
        <PlacementTaskContainer />
      </div>
    </div>
  );
}
