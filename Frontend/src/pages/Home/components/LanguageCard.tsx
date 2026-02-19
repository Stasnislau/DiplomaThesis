import Button from "@/components/common/Button";
import { LanguageLevel } from "@/types/models/LanguageLevel";
import React from "react";
import { useTranslation } from "react-i18next";

interface LanguageCardProps {
  name: string;
  code: string;
  isStarted: boolean;
  totalLessons?: number;
  completedLessons?: number;
  flagIcon: React.ReactNode;
  levels?: string[];
  currentLevel?: string | LanguageLevel;
  onStartTest: () => void;
  onContinue: () => void;
}

export const LanguageCard: React.FC<LanguageCardProps> = ({
  name,
  isStarted,
  totalLessons,
  completedLessons,
  flagIcon,
  currentLevel,
  onStartTest,
  onContinue,
}) => {
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-700 rounded-xl shadow-md p-6 hover:shadow-lg transition-all duration-200 border border-transparent dark:border-gray-600">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="transform transition-transform hover:scale-110">
            {flagIcon}
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{name}</h3>
        </div>
      </div>

      {currentLevel === LanguageLevel.NATIVE ? (
        <div className="flex items-center justify-center text-green-600 dark:text-green-400 font-medium p-4 bg-green-50 dark:bg-green-900/30 rounded-lg border border-green-100 dark:border-green-900/50">
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
          {t('levels.NATIVE') || "Native Speaker"}
        </div>
      ) :
      /* Case 2: Learning Started */
      isStarted ? (
        <div>
          <div className="mb-4">
            <p className="text-gray-600 dark:text-gray-300">
              {t('languages.proficiencyLevel')}: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{currentLevel}</span>
            </p>
            <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{
                  width: `${(completedLessons! / totalLessons!) * 100}%`,
                }}
              />
            </div>
            {totalLessons && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {completedLessons} of {totalLessons} lessons completed
              </p>
            )}
          </div>
          <Button variant="primary" className="w-full" onClick={onContinue}>
            Continue Learning
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Start learning {name} today!
          </p>
          <Button variant="secondary" className="w-full" onClick={onStartTest}>
            {t('placementTest.start') || "Take Placement Test"}
          </Button>
        </div>
      )}
    </div>
  );
};
