import { AnimatePresence, motion } from "framer-motion";
import { usePlacementTestStore } from "@/store/usePlacementTestStore";
import { PlacementTask } from "./PlacementTask";
import LoadingSpinner from "@/components/layout/Loading";
import { PlacementAnswer } from "../types/EvaluationResult";
import { usePlacementTask } from "../api/hooks/usePlacementTask";
import { useEffect, useRef } from "react";

export const PlacementTaskContainer = () => {
  const { createTask, isLoading } = usePlacementTask();

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
    advanceTasks,
  } = usePlacementTestStore();

  const isFetching = useRef(false);

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
  
      try {
        if (!currentTask && !nextTask) {
          // Initial load - run in parallel
          const [task1, task2] = await Promise.all([
            createTask({ language: language.name }),
            testTotalQuestions > 1
              ? createTask({
                  language: language.name,
                  previousAnswer: {
                    isCorrect: true, // Dummy value
                    questionNumber: 0,
                  },
                })
              : Promise.resolve(null),
          ]);
          setTasks({ current: task1, next: task2 });
        } else if (currentTask && !nextTask) {
          // Fetch next task after an answer
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
            setTasks({ current: currentTask, next: task });
          }
        }
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
    testTotalQuestions,
    userAnswers,
  ]);

  const handleAnswer = (placementAnswer: PlacementAnswer) => {
    if (!currentTask) return;
    addAnswer(
      {
        ...placementAnswer,
        questionNumber: currentQuestionNumber,
      },
      currentTask
    );
    advanceTasks();
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
        {!currentTask && isLoading ? (
          <LoadingSpinner />
        ) : currentTask ? (
          <PlacementTask
            task={currentTask}
            onAnswer={handleAnswer}
            currentQuestion={currentQuestionNumber} 
          />
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
};

export default PlacementTaskContainer;
