import { FillInTheBlankTask, MultipleChoiceTask } from "@/types/responses/TaskResponse";
import React, { useEffect, useState } from "react";

import Button from "@/components/common/Button";
import { TaskComponent } from "./components/TaskComponent";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";
import { useCreateTask } from "@/api/hooks/useCreateTask";
import { useExplainAnswer } from "@/api/hooks/useExplainAnswer";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "Spanish", flag: "🇪🇸" },
  { code: "French", flag: "🇫🇷" },
  { code: "German", flag: "🇩🇪" },
  { code: "Russian", flag: "🇷🇺" },
  { code: "Polish", flag: "🇵🇱" },
  { code: "English", flag: "🇬🇧" },
  { code: "Italian", flag: "🇮🇹" },
];

export const TaskPage: React.FC = () => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState("");
  const [level, setLevel] = useState("");
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentTaskData, setCurrentTaskData] = useState<MultipleChoiceTask | FillInTheBlankTask | null>(null);
  const { createTask, isLoading, error, data } = useCreateTask();
  const {
    explainAnswer,
    isLoading: isExplaining,
    data: explanationData,
  } = useExplainAnswer();

  const handleCreateTask = () => {
    if (language && level) {
      setCurrentTaskData(null);

      const taskType =
        Math.random() < 0.5 ? "multiple_choice" : "fill_in_the_blank";
      createTask({ language, level, taskType });

      setUserAnswer("");
      setShowExplanation(false);
      setIsCorrect(null);
    } 
  };

  useEffect(() => {
    if (language || level) {
      setCurrentTaskData(null);
    }
  }, [language, level]);

  const handleCheckAnswer = () => {
    if (!currentTaskData || !userAnswer) return;

    let isAnswerCorrect = false;
    if (isMultipleChoice(currentTaskData)) {
      const correctOptionIndex = currentTaskData?.options?.indexOf(
        Array.isArray(currentTaskData.correctAnswer) ? currentTaskData.correctAnswer[0] : currentTaskData.correctAnswer
      );
      if (correctOptionIndex === undefined || !currentTaskData.options) return;
      isAnswerCorrect =
        currentTaskData.options[correctOptionIndex] === userAnswer;
    } else {
      isAnswerCorrect = currentTaskData.correctAnswer === userAnswer;
    }
    setIsCorrect(isAnswerCorrect);
  };

  useEffect(() => {
    if (data && !currentTaskData && !isLoading) {
      setCurrentTaskData(data as MultipleChoiceTask | FillInTheBlankTask);
    }
  }, [data, isLoading, currentTaskData]);

  const handleExplainAnswer = () => {
    if (currentTaskData && userAnswer) {
      setShowExplanation(true);
      explainAnswer({
        language,
        level,
        task: currentTaskData.question,
        correctAnswer: Array.isArray(currentTaskData.correctAnswer) ? currentTaskData.correctAnswer[0] : currentTaskData.correctAnswer,
        userAnswer: userAnswer,
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-6 flex flex-col justify-center sm:py-12 transition-colors duration-300">
      <div className="relative py-3 sm:max-w-2xl sm:mx-auto w-full px-4">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500 dark:from-blue-900 dark:via-indigo-900 dark:to-purple-900 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl transition-all duration-300 hover:-rotate-3 opacity-70"></div>

        <div className="relative px-4 py-10 bg-white dark:bg-gray-800 shadow-xl sm:rounded-3xl sm:p-20 transition-colors duration-300">
          <div className="max-w-md mx-auto">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="pb-8 text-center">
                <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 mb-2">
                  Language Learning
                </h1>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  {t('languages.chooseLanguage')} & {t('languages.proficiencyLevel')}
                </p>
              </div>

              <div className="py-8 space-y-6">
                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {t('languages.chooseLanguage')}
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => setLanguage(lang.code)}
                        className={`py-2 px-2 rounded-lg text-xs font-medium transition-all duration-200 flex flex-col items-center gap-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          language === lang.code
                            ? "bg-indigo-600 text-white shadow-md scale-105"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                        aria-pressed={language === lang.code}
                      >
                        <span className="text-lg" role="img" aria-hidden="true">{lang.flag}</span>
                        <span>{t(`languages.${lang.code.toLowerCase()}`) || lang.code}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    {t('languages.proficiencyLevel')}
                  </label>
                  <div className="grid grid-cols-6 gap-2">
                    {["A1", "A2", "B1", "B2", "C1", "C2"].map((lvl) => (
                      <button
                        key={lvl}
                        onClick={() => setLevel(lvl)}
                        className={`py-2 px-1 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                          level === lvl
                            ? "bg-indigo-600 text-white shadow-md"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                        }`}
                        aria-pressed={level === lvl}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleCreateTask}
                  disabled={!language || !level || isLoading}
                  variant="primary"
                  isLoading={isLoading}
                  className="w-full justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('tasks.generateTask')}
                </Button>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <p className="text-sm text-red-600 dark:text-red-400">{t('common.error')}: {error.message}</p>
              </div>
            )}

            {currentTaskData && (
              <div className="mt-8">
                <TaskComponent
                  taskData={currentTaskData}
                  userAnswer={userAnswer}
                  setUserAnswer={setUserAnswer}
                  onCheckAnswer={handleCheckAnswer}
                  onExplainAnswer={handleExplainAnswer}
                  isCorrect={isCorrect}
                  isExplaining={isExplaining}
                  explanationData={explanationData}
                  showExplanation={showExplanation}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
