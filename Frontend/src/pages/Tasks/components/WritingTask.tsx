import { FillInTheBlankTask, MultipleChoiceTask } from "@/types/responses/TaskResponse";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/common/Tabs";
import { useEffect, useState } from "react";

import Button from "@/components/common/Button";
import { TaskComponent } from "@/pages/Quiz/components/TaskComponent";
import { isAnswerCorrect as checkAnswer } from "@/utils/answerValidation";
import { isMultipleChoice } from "@/types/typeGuards/isMultipleChoice";
import { useCreateBlankSpaceTask } from "@/api/hooks/useCreateBlankSpaceTask";
import { useCreateMultipleChoiceTask } from "@/api/hooks/useCreateMultipleChoiceTask";
import { useExplainAnswer } from "@/api/hooks/useExplainAnswer";
import { useGenerateAdaptiveTask } from "@/api/hooks/useGenerateAdaptiveTask";
import { useTranslation } from "react-i18next";

const LANGUAGES = [
  { code: "spanish", flag: "🇪🇸" },
  { code: "french", flag: "🇫🇷" },
  { code: "german", flag: "🇩🇪" },
  { code: "russian", flag: "🇷🇺" },
  { code: "polish", flag: "🇵🇱" },
  { code: "english", flag: "🇬🇧" },
  { code: "italian", flag: "🇮🇹" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];

interface WritingTaskProps {
  initialLanguage?: string;
  initialLevel?: string;
  initialTaskType?: "multiple-choice" | "fill-blank";
}

const WritingTask = ({ initialLanguage, initialLevel, initialTaskType }: WritingTaskProps) => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState(initialLanguage || "");
  const [level, setLevel] = useState(initialLevel || "");

  useEffect(() => {
    if (initialLanguage) setLanguage(initialLanguage);
    if (initialLevel) setLevel(initialLevel);
  }, [initialLanguage, initialLevel]);
  const [userAnswer, setUserAnswer] = useState("");
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [currentTaskData, setCurrentTaskData] = useState<MultipleChoiceTask | FillInTheBlankTask | null>(null);
  const [taskType, setTaskType] = useState<"multiple-choice" | "fill-blank">(initialTaskType || "multiple-choice");

  const { createTask: createMultipleChoice, isLoading: isLoadingMC, data: dataMC, error: errorMC } = useCreateMultipleChoiceTask();
  const { createTask: createFillBlank, isLoading: isLoadingFB, data: dataFB, error: errorFB } = useCreateBlankSpaceTask();
  const {
    generate: generateAdaptive,
    isLoading: isLoadingAdaptive,
    data: adaptiveData,
    error: errorAdaptive,
    reset: resetAdaptive,
  } = useGenerateAdaptiveTask();

  const {
    explainAnswer,
    isLoading: isExplaining,
    data: explanationData,
  } = useExplainAnswer();

  const isLoading = isLoadingMC || isLoadingFB || isLoadingAdaptive;
  const error = errorMC || errorFB || errorAdaptive;
  const data = dataMC || dataFB || adaptiveData?.task;
  const targetedWeaknesses = adaptiveData?.targetedWeaknesses ?? [];

  const handleCreateTask = () => {
    if (language && level) {
      setCurrentTaskData(null);
      resetAdaptive();
      const backendLanguage = language.charAt(0).toUpperCase() + language.slice(1);

      if (taskType === "multiple-choice") {
        createMultipleChoice({ language: backendLanguage, level });
      } else {
        createFillBlank({ language: backendLanguage, level });
      }
      setUserAnswer("");
      setShowExplanation(false);
      setIsCorrect(null);
    }
  };

  const handleAdaptive = () => {
    if (!language || !level) return;
    setCurrentTaskData(null);
    setUserAnswer("");
    setShowExplanation(false);
    setIsCorrect(null);
    const backendLanguage =
      language.charAt(0).toUpperCase() + language.slice(1);
    generateAdaptive({
      language: backendLanguage,
      level,
      flavour: taskType === "multiple-choice"
        ? "multiple_choice"
        : "fill_in_the_blank",
    });
  };

  useEffect(() => {
    if (data && !currentTaskData && !isLoading) {
      setCurrentTaskData(data as MultipleChoiceTask | FillInTheBlankTask);
    }
  }, [data, isLoading, currentTaskData]);


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
      isAnswerCorrect = checkAnswer(userAnswer, currentTaskData.correctAnswer);
    }
    setIsCorrect(isAnswerCorrect);
  };

  const handleExplainAnswer = () => {
    if (currentTaskData && userAnswer) {
      setShowExplanation(true);
      const backendLanguage = language.charAt(0).toUpperCase() + language.slice(1);
      explainAnswer({
        language: backendLanguage,
        level,
        task: currentTaskData.question,
        correctAnswer: Array.isArray(currentTaskData.correctAnswer) ? currentTaskData.correctAnswer[0] : currentTaskData.correctAnswer,
        userAnswer: userAnswer,
      });
    }
  };


  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl p-6 border border-indigo-100 dark:border-gray-600 transition-colors duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
            <span className="text-lg" role="img" aria-hidden="true">🌍</span>
          </div>
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {t('languages.chooseLanguage')}
          </label>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className={`flex-1 min-w-[90px] py-3 px-2 rounded-xl text-sm font-medium transition-all duration-200 flex flex-col items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                language === lang.code
                  ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300 dark:ring-indigo-700"
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-indigo-50 dark:hover:bg-gray-700 hover:border-indigo-200"
              }`}
              aria-pressed={language === lang.code}
              aria-label={t(`languages.${lang.code}`)}
            >
              <span className="text-2xl" role="img" aria-hidden="true">{lang.flag}</span>
              <span className="text-xs font-semibold">{t(`languages.${lang.code}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Level Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center">
            <span className="text-lg" role="img" aria-hidden="true">📊</span>
          </div>
          <label className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            {t('languages.proficiencyLevel')}
          </label>
        </div>
        <div className="flex flex-wrap gap-3">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setLevel(lvl)}
              className={`flex-1 min-w-[60px] py-2 px-3 rounded-lg text-sm font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                level === lvl
                  ? "bg-purple-600 text-white shadow-md ring-2 ring-purple-300 dark:ring-purple-700"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-purple-50 dark:hover:bg-gray-600 hover:text-purple-700 dark:hover:text-purple-300"
              }`}
              aria-pressed={level === lvl}
            >
              {lvl}
            </button>
          ))}
        </div>
      </div>

      {/* Task Type Selection */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-300">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <span className="text-lg" role="img" aria-hidden="true">✍️</span>
          </div>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Task Type</h2>
        </div>
        
        <Tabs defaultValue="multiple-choice" onValueChange={(value) => setTaskType(value as "multiple-choice" | "fill-blank")}>
          <TabsList className="grid grid-cols-2 gap-2 bg-gray-100 dark:bg-gray-700 p-1 rounded-lg mb-4 h-auto">
            <TabsTrigger 
              value="multiple-choice"
              className="rounded-md py-2 px-3 text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-white dark:text-gray-300"
            >
              <span className="mr-2" role="img" aria-hidden="true">🔘</span>
              {t('tasks.multipleChoice')}
            </TabsTrigger>
            <TabsTrigger 
              value="fill-blank"
              className="rounded-md py-2 px-3 text-sm font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-gray-600 data-[state=active]:shadow-sm data-[state=active]:text-indigo-600 dark:data-[state=active]:text-white dark:text-gray-300"
            >
              <span className="mr-2" role="img" aria-hidden="true">📝</span>
              {t('tasks.fillInBlank')}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="multiple-choice">
            <Button
              onClick={handleCreateTask}
              disabled={!language || !level || isLoading}
              variant="primary"
              isLoading={isLoading}
              className="w-full h-12 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('tasks.generateTask')}
            </Button>
          </TabsContent>
          <TabsContent value="fill-blank">
            <Button
              onClick={handleCreateTask}
              disabled={!language || !level || isLoading}
              variant="primary"
              isLoading={isLoading}
              className="w-full h-12 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('tasks.generateTask')}
            </Button>
          </TabsContent>
        </Tabs>
        {/* Adaptive — biases the next task toward the user's recent
            weaknesses (placement misses, low-score topics, speech
            errors). Falls back to the regular variety picker when
            there's no history yet. */}
        <button
          type="button"
          onClick={handleAdaptive}
          disabled={!language || !level || isLoading}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 px-4 py-2.5 text-sm font-semibold text-amber-700 dark:text-amber-300 transition-colors hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span role="img" aria-hidden="true">🎯</span>
          {t("tasks.practiceWeakSpots")}
        </button>
        {adaptiveData?.derivedFromHistory && targetedWeaknesses.length > 0 && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            {t("tasks.targetingFromHistory", {
              focus: targetedWeaknesses.slice(0, 3).join(", "),
            })}
          </p>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-200 dark:border-red-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
              <span className="text-lg" role="img" aria-hidden="true">⚠️</span>
            </div>
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error.message}</p>
          </div>
        </div>
      )}

      {currentTaskData && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg transition-colors duration-300">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
              <span className="text-white text-lg" role="img" aria-hidden="true">🎯</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Your Task</h3>
          </div>
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
  );
};

export default WritingTask;
