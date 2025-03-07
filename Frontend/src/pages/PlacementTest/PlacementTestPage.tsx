import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useCallback, useMemo } from "react";
import { usePlacementTask } from "@/api/hooks/usePlacementTask";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "@/components/layout/Loading";
import { useAvailableLanguages } from "@/api/hooks/useAvailableLanguages";
import { PlacementTaskComponent } from "./components/PlacementTaskComponent";

const TOTAL_QUESTIONS = 10;

export function PlacementTestPage() {
  const { languageCode } = useParams<{ languageCode: string }>();
  const navigate = useNavigate();
  const { createTask, isLoading } = usePlacementTask();
  const {
    currentQuestionNumber,
    userAnswers,
    isTestComplete,
    addAnswer,
    cachedTasks,
    addTask,
    getCurrentTask,
    setCurrentQuestionNumber,
  } = usePlacementTestStore();
  const { languages } = useAvailableLanguages();
  const [isInitialized, setIsInitialized] = useState(false);

  const language = useMemo(
    () => languages?.find((lang) => lang.code === languageCode),
    [languages, languageCode]
  );
  useEffect(() => {
    if (
      cachedTasks.length === 0 &&
      currentQuestionNumber === 0 &&
      !isInitialized
    ) {
      if (language) {
        createNextTask(language.name);
      }
      setIsInitialized(true);
      setCurrentQuestionNumber(1);
    }
  }, [cachedTasks, currentQuestionNumber, language, isInitialized]);

  const createNextTask = useCallback(
    async (languageName: string) => {
      const lastAnswer =
        userAnswers.length > 0
          ? userAnswers[userAnswers.length - 1]
          : undefined;

      const task = await createTask({
        language: languageName,
        previousAnswer: lastAnswer
          ? {
              isCorrect: lastAnswer.isCorrect,
              questionNumber: lastAnswer.questionNumber,
            }
          : undefined,
      });

      if (task) {
        addTask(task as MultipleChoiceTask | FillInTheBlankTask);
      }
    },
    [userAnswers, createTask, addTask]
  );

  useEffect(() => {
    if (!language) {
      navigate("/");
      return;
    }

    if (isTestComplete) {
      navigate(`/placement/result/${languageCode}`);
      return;
    }
  }, [languageCode, language, isTestComplete, navigate]);

  useEffect(() => {
    if (!language) return;

    if (currentQuestionNumber <= TOTAL_QUESTIONS && !isInitialized) {
      const needToCreateTask = cachedTasks.length < currentQuestionNumber + 1;
      if (needToCreateTask && !isLoading) {
        createNextTask(language.name);
      }
    }
  }, [
    languages,
    languageCode,
    currentQuestionNumber,
    cachedTasks,
    isLoading,
    createNextTask,
    isInitialized,
  ]);

  const currentTask = getCurrentTask();

  console.log(currentQuestionNumber, cachedTasks);

  console.log(currentTask);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Placement Test: {language?.name}
            </h1>
            <div className="text-sm font-medium text-gray-600">
              Question {currentQuestionNumber} of {TOTAL_QUESTIONS}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full" 
              style={{ width: `${(currentQuestionNumber / TOTAL_QUESTIONS) * 100}%` }}
            ></div>
          </div>
        </div>
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionNumber}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            {currentTask ? (
              <PlacementTaskComponent
                task={currentTask}
                currentQuestion={currentQuestionNumber}
                onAnswer={(placementAnswer) => {
                  addAnswer({
                    ...placementAnswer,
                    questionNumber: currentQuestionNumber
                  });
                }}
              />
            ) : (
              <LoadingSpinner />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
