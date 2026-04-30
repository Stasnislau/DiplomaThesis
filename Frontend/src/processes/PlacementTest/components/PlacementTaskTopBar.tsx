import { TOTAL_QUESTIONS } from "@/constants";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { useTranslation } from "react-i18next";

export const PlacementTaskTopBar = () => {
  const { currentQuestionNumber, language } = usePlacementTestStore();
  const { t } = useTranslation();

  const localizedLanguage =
    t(`languages.${language.name?.toLowerCase()}`) || language.name;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t("placementTest.heading", { language: localizedLanguage })}
        </h1>
        <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {t("placementTest.question", {
            current: currentQuestionNumber + 1,
            total: TOTAL_QUESTIONS,
          })}
        </div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
          style={{
            width: `${((currentQuestionNumber) / TOTAL_QUESTIONS) * 100}%`,
          }}
        ></div>
      </div>
    </div>
  );
};
