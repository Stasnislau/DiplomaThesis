import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import Button from "@/components/common/Button";
import LoadingSpinner from "@/components/layout/Loading";
import { PlacementTask } from "./PlacementTask";
import { UserAnswer } from "@/store/usePlacementTestStore";
import { useNavigate } from "react-router-dom";
import { usePlacementTask } from "../api/hooks/usePlacementTask";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { useTranslation } from "react-i18next";

export const PlacementTaskContainer = () => {
    const { createTask } = usePlacementTask();
    const { t } = useTranslation();
    const navigate = useNavigate();

  const {
    language,
    currentQuestionNumber,
    userAnswers,
    isTestComplete,
    testTotalQuestions,
    currentTask,
    nextTask,
    addAnswer,
    setTasks,
    setNextTask,
    advanceTasks,
    resetTest,
  } = usePlacementTestStore();

  const isFetching = useRef(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    const fetcher = async () => {
      if (
        !language.name ||
        isTestComplete ||
        isFetching.current ||
        (currentTask && nextTask) ||
        currentQuestionNumber >= testTotalQuestions
      ) {
        return;
      }

      isFetching.current = true;
      setFetchError(null);

      try {
        if (!currentTask && !nextTask) {
          const [task1, task2] = await Promise.all([
            createTask({ language: language.name }),
            testTotalQuestions > 1
              ? createTask({
                  language: language.name,
                  previousAnswer: {
                    isCorrect: true,
                    questionNumber: 0,
                  },
                })
              : Promise.resolve(null),
          ]);
          setTasks({ current: task1, next: task2 });
        } else if (currentTask && !nextTask) {
          const lastAnswer = userAnswers[userAnswers.length - 1];
          if (currentQuestionNumber < testTotalQuestions) {
            const task = await createTask({
              language: language.name,
              previousAnswer: lastAnswer
                ? {
                    isCorrect: lastAnswer.isCorrect,
                    questionNumber: lastAnswer.questionNumber,
                  }
                : undefined,
            });
            setNextTask(task);
          }
        } else if (!currentTask && nextTask) {
          setTasks({ current: nextTask, next: null });
        }
      } catch (e) {
        const message =
          e instanceof Error ? e.message : t("placementTest.fetchFailed");
        setFetchError(message);
      } finally {
        isFetching.current = false;
      }
    };

    fetcher();
  }, [
    language,
    currentQuestionNumber,
    currentTask,
    nextTask,
    isTestComplete,
    createTask,
    setTasks,
    setNextTask,
    testTotalQuestions,
    userAnswers,
    retryNonce,
    t,
  ]);

  const handleAnswer = (placementAnswer: UserAnswer) => {
    if (!currentTask) return;
    addAnswer(
      {
        ...placementAnswer,
        questionNumber: currentQuestionNumber,
        question: currentTask.question
      },
      currentTask
    );
    advanceTasks();
  };

  const handleRetry = () => {
    setFetchError(null);
    setRetryNonce((n) => n + 1);
  };

  const handleAbort = () => {
    resetTest();
    navigate("/");
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentQuestionNumber}
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -50 }}
        transition={{ duration: 0.3 }}
      >
        {fetchError ? (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center space-y-4">
            <h3 className="text-lg font-semibold text-red-700 dark:text-red-300">
              {t("placementTest.errorTitle")}
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 whitespace-pre-line">
              {fetchError}
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="primary" onClick={handleRetry}>
                {t("common.retry")}
              </Button>
              <Button variant="secondary" onClick={handleAbort}>
                {t("placementTest.abort")}
              </Button>
            </div>
          </div>
        ) : !currentTask ? (
          <LoadingSpinner />
        ) : (
          <PlacementTask
            task={currentTask}
            onAnswer={handleAnswer}
            currentQuestion={currentQuestionNumber}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default PlacementTaskContainer;
