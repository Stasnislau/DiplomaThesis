import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState, useCallback } from "react";
import { usePlacementTask } from "@/api/hooks/usePlacementTask";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { useParams, useNavigate } from "react-router-dom";
import LoadingSpinner from "@/components/layout/Loading";
import { useAvailableLanguages } from "@/api/hooks/useAvailableLanguages";
import { PlacementTaskComponent } from "./components/PlacementTaskComponent";
import { MultipleChoiceTask, FillInTheBlankTask } from "@/types/responses/TaskResponse";
import { TOTAL_QUESTIONS } from "@/constants";

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
    resetTest
  } = usePlacementTestStore();
  const { languages } = useAvailableLanguages();
  const [isInitialized, setIsInitialized] = useState(false);

  const language = languages?.find((lang) => lang.code === languageCode);

  // Reset test when language changes
  useEffect(() => {
    if (language) {
      resetTest();
      setIsInitialized(false);
    }
  }, [language, resetTest]);

  const createNextTask = useCallback(
    async (languageName: string) => {
      if (isLoading) return;

      const lastAnswer = userAnswers.length > 0 
        ? userAnswers[userAnswers.length - 1] 
        : undefined;

      try {
        const task = await createTask({
          language: languageName,
          previousAnswer: lastAnswer ? {
            isCorrect: lastAnswer.isCorrect,
            questionNumber: lastAnswer.questionNumber,
          } : undefined,
        });

        if (task) {
          addTask(task as MultipleChoiceTask | FillInTheBlankTask);
        }
      } catch (error) {
        console.error("Failed to create task:", error);
      }
    },
    [userAnswers, createTask, addTask, isLoading]
  );

  useEffect(() => {
    const initializeTask = async () => {
      if (!language || isInitialized || isLoading) return;

    if (cachedTasks.length === 0) {
      await createNextTask(language.name);
      setIsInitialized(true);
    } else {
        setIsInitialized(true);
      }
    };
    initializeTask();
  }, [language, isInitialized, isLoading, cachedTasks.length, createNextTask]);

  // Handle test completion and navigation
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

  // Create next task when needed
  useEffect(() => {
    if (!language || isLoading) return;

    const needNextTask = cachedTasks.length === currentQuestionNumber;
    if (needNextTask && currentQuestionNumber < TOTAL_QUESTIONS) {
      createNextTask(language.name);
    }
  }, [language, currentQuestionNumber, cachedTasks.length, isLoading, createNextTask]);

  const currentTask = getCurrentTask();

  if (!language) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">
              Placement Test: {language.name}
            </h1>
            <div className="text-sm font-medium text-gray-600">
              Question {currentQuestionNumber + 1} of {TOTAL_QUESTIONS}
            </div>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full" 
              style={{ width: `${((currentQuestionNumber + 1) / TOTAL_QUESTIONS) * 100}%` }}
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
                currentQuestion={currentQuestionNumber + 1}
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
