import { FillInTheBlankTask, MultipleChoiceTask } from "@/types/responses/TaskResponse";
import React, { useCallback } from "react";

import Button from "@/components/common/Button";
import { useTranslation } from "react-i18next";

interface TaskComponentProps {
  taskData: MultipleChoiceTask | FillInTheBlankTask;
  userAnswer: string;
  setUserAnswer: (answer: string) => void;
  onCheckAnswer: () => void;
  onExplainAnswer: () => void;
  isCorrect: boolean | null;
  isExplaining: boolean;
  explanationData?: {
    explanation: string;
    topics_to_review?: string[];
  };
  showExplanation: boolean;
}

export const TaskComponent: React.FC<TaskComponentProps> = ({
  taskData,
  userAnswer,
  setUserAnswer,
  onCheckAnswer,
  onExplainAnswer,
  isCorrect,
  isExplaining,
  explanationData,
  showExplanation,
}) => {
  const { t } = useTranslation();

  const renderAnswerInput = useCallback(() => {
    switch (taskData.type) {
      case "multiple_choice":
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {taskData.options?.map((option, index) => (
              <button
                key={option}
                onClick={() => setUserAnswer(option)}
                className={`p-3 rounded-xl border-2 transition-all duration-200 text-left transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  userAnswer === option
                    ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-transparent shadow-lg"
                    : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500 hover:bg-gray-50 dark:hover:bg-gray-700"
                }`}
                aria-pressed={userAnswer === option}
              >
                <span className={`block text-xs mb-0.5 font-semibold ${userAnswer === option ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}>
                  {t("tasks.optionLabel", { letter: String.fromCharCode(65 + index) })}
                </span>
                <span className="font-medium text-sm">{option}</span>
              </button>
            ))}
          </div>
        );

      default:
        return (
          <div className="relative">
            <input
              type="text"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              className="w-full p-4 pl-5 border-2 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700 placeholder-gray-400 dark:placeholder-gray-500"
              aria-label={t("tasks.answerInputAria")}
              placeholder={t('tasks.fillInBlank') + "..."}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
              <svg
                className="h-5 w-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
            </div>
          </div>
        );
    }
  }, [taskData, userAnswer, setUserAnswer, t]);

  return (
    <div className="mt-4 space-y-4">
      <div className="bg-gray-50 dark:bg-gray-900 p-5 rounded-xl border border-gray-200 dark:border-gray-700 transition-colors duration-300">
        <div className="flex items-center justify-between mb-3">
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
              taskData.type === "multiple_choice"
                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                : "bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300"
            }`}
          >
            {taskData.type === "multiple_choice"
              ? t('tasks.multipleChoice')
              : t('tasks.fillInBlank')}
          </span>
        </div>
        <p className="text-base font-medium text-gray-900 dark:text-white leading-relaxed">{taskData.question}</p>
      </div>

      <div className="space-y-4">
        {renderAnswerInput()}

        <Button 
          onClick={onCheckAnswer} 
          disabled={!userAnswer} 
          variant="primary"
          className="w-full py-3 text-sm font-semibold rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {t('tasks.checkAnswer')}
        </Button>
      </div>

      {isCorrect !== null && (
        <div
          className={`mt-4 p-4 rounded-xl border animate-in fade-in slide-in-from-bottom-4 duration-300 ${
            isCorrect
              ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
              : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          }`}
          role="alert"
        >
          <div className="flex items-center">
            {isCorrect ? (
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-800 text-green-600 dark:text-green-200 mr-3">
                 <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                 </svg>
              </div>
            ) : (
              <div className="flex items-center justify-center h-8 w-8 rounded-full bg-red-100 dark:bg-red-800 text-red-600 dark:text-red-200 mr-3">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
            <p
              className={`text-lg font-bold ${
                isCorrect ? "text-green-800 dark:text-green-300" : "text-red-800 dark:text-red-300"
              }`}
            >
              {isCorrect ? t('tasks.correct') : t('tasks.incorrect')}
            </p>
          </div>

          {!isCorrect && (
            <div className="mt-4 space-y-4 pl-11">
              <div className="text-gray-700 dark:text-gray-300">
                <span className="font-medium">
                  {Array.isArray(taskData.correctAnswer) && taskData.correctAnswer.length > 1
                    ? t("tasks.acceptedAnswers")
                    : t("tasks.correctAnswerLabel")}
                </span>
                {Array.isArray(taskData.correctAnswer) ? (
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {taskData.correctAnswer.join(" / ")}
                  </span>
                ) : (
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {taskData.correctAnswer}
                  </span>
                )}
              </div>

              <Button
                isLoading={isExplaining}
                onClick={onExplainAnswer}
                variant="tertiary"
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
              >
                {t('tasks.showExplanation')}
              </Button>
            </div>
          )}

        </div>
      )}

      {isExplaining && (
        <div className="animate-pulse space-y-4 py-4" aria-label={t("tasks.loadingExplanation")}>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
          </div>
        </div>
      )}

      {explanationData && showExplanation && (
        <div className="mt-6 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 mb-3">
             <span className="text-xl" role="img" aria-hidden="true">💡</span>
             <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-300">
               {t("tasks.explanationTitle")}
             </h3>
          </div>
          <p className="text-indigo-800 dark:text-indigo-200 leading-relaxed">{explanationData.explanation}</p>
          {explanationData.topics_to_review && (
            <div className="mt-4 border-t border-indigo-200 dark:border-indigo-800/50 pt-4">
              <h4 className="text-sm font-semibold text-indigo-900 dark:text-indigo-300 mb-2 uppercase tracking-wide">
                {t("tasks.topicsToReviewLabel")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {explanationData.topics_to_review.map((topic) => (
                  <span
                    key={topic}
                    className="px-3 py-1 rounded-full bg-white dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-sm font-medium border border-indigo-100 dark:border-indigo-800"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
